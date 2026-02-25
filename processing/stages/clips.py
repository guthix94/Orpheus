"""Audio clips processing — segment lesson audio, upload clips to Supabase Storage.

Takes VAD segments and groups consecutive segments into clips. Adjacent segments
with a gap < 4 seconds belong to the same clip; gaps >= 4 seconds start a new
clip.  Clips that contain only silence are skipped.

Each clip is sliced from the original audio via ffmpeg and re-encoded to
Opus/WebM for consistent output regardless of input format (mp3, wav, m4a,
webm, etc.).  Uploaded to Supabase Storage.

Graceful degradation: any failure returns an empty list — never crashes the
pipeline.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# If the gap between two consecutive VAD segments is less than this, they
# belong to the same clip.
_CLIP_GAP_THRESHOLD_S = 4.0

# Clips shorter than this after clamping are skipped (not worth uploading).
_MIN_CLIP_DURATION_S = 0.5

# Files smaller than this are considered empty (just container headers, no
# real audio content).  A webm with only headers is typically ~1 KB.
_MIN_CLIP_FILE_BYTES = 1024

# How far (seconds) from an LLM boundary to search for a natural pause.
_SNAP_SEARCH_WINDOW_S = 5.0

# Minimum silence/gap duration to count as a valid snap target.
_MIN_PAUSE_FOR_SNAP_S = 0.15


@dataclass
class ClipGroup:
    """A group of consecutive VAD segments that form one clip."""

    start: float
    end: float
    types: set[str] = field(default_factory=set)

    @property
    def duration(self) -> float:
        return self.end - self.start


def group_segments_into_clips(vad_segments: list[dict]) -> list[ClipGroup]:
    """Group consecutive VAD segments into clips.

    Rules:
    - If the gap between adjacent segments is < 4s, same clip.
    - If the gap is >= 4s, new clip.
    - Skip clips that contain only silence (must have at least one speech or
      music segment).
    """
    if not vad_segments:
        return []

    clips: list[ClipGroup] = []
    current = ClipGroup(
        start=vad_segments[0]["start"],
        end=vad_segments[0]["end"],
        types={vad_segments[0]["type"]},
    )

    for seg in vad_segments[1:]:
        gap = seg["start"] - current.end
        if gap < _CLIP_GAP_THRESHOLD_S:
            # Extend current clip
            current.end = seg["end"]
            current.types.add(seg["type"])
        else:
            # Finalize current clip and start a new one
            clips.append(current)
            current = ClipGroup(
                start=seg["start"],
                end=seg["end"],
                types={seg["type"]},
            )

    # Don't forget the last clip
    clips.append(current)

    # Filter out silence-only clips
    clips = [c for c in clips if c.types - {"silence"}]

    return clips


def _get_audio_duration(audio_path: str) -> float | None:
    """Probe the actual duration of an audio file using ffmpeg.

    Returns duration in seconds, or None if probing fails.
    """
    import imageio_ffmpeg

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    # Running ffmpeg with only -i (no output) prints media info to stderr.
    cmd = [ffmpeg_path, "-i", audio_path]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=10)
        stderr = result.stderr.decode(errors="replace")
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+)\.(\d+)", stderr)
        if match:
            h, m, s, frac = match.groups()
            return (
                int(h) * 3600
                + int(m) * 60
                + int(s)
                + int(frac) / (10 ** len(frac))
            )
    except Exception:
        logger.debug("Clips: failed to probe duration for %s", audio_path, exc_info=True)
    return None


def _slice_audio(
    audio_path: str, start: float, end: float, output_path: str
) -> bool:
    """Slice a segment from an audio file using ffmpeg.

    Re-encodes to Opus/WebM so the output format is consistent regardless of
    the input format (mp3, wav, m4a, webm, etc.).  ``-vn`` strips video
    streams that some files embed (e.g. album art in mp3).

    Returns True on success, False on failure.
    """
    import imageio_ffmpeg

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_path,
        "-y",
        "-ss", str(start),
        "-to", str(end),
        "-i", audio_path,
        "-vn",
        "-c:a", "libopus",
        "-b:a", "64k",
        output_path,
    ]
    logger.debug("Clips: slicing audio — %s", " ".join(cmd))

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=60)
        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            logger.error("Clips: ffmpeg slice failed (rc=%d): %s", result.returncode, stderr[:500])
            return False

        # Verify output exists and has real audio content (not just
        # container headers).  A webm with only headers is ~1 KB.
        if not os.path.exists(output_path) or os.path.getsize(output_path) < _MIN_CLIP_FILE_BYTES:
            logger.error("Clips: ffmpeg produced empty/too-small output for %s [%.1f-%.1f]", audio_path, start, end)
            return False

        return True
    except subprocess.TimeoutExpired:
        logger.error("Clips: ffmpeg slice timed out for [%.1f-%.1f]", start, end)
        return False
    except Exception:
        logger.exception("Clips: ffmpeg slice error for [%.1f-%.1f]", start, end)
        return False


def _upload_clip(
    clip_bytes: bytes,
    lesson_id: uuid.UUID,
    clip_index: int,
    supabase_url: str,
    service_role_key: str,
) -> str | None:
    """Upload a clip to Supabase Storage.

    Returns the public URL on success, None on failure.
    """
    object_path = f"clips/{lesson_id}/clip_{clip_index:03d}.webm"
    upload_url = f"{supabase_url}/storage/v1/object/{object_path}"

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "audio/webm",
    }

    try:
        resp = httpx.post(
            upload_url,
            content=clip_bytes,
            headers=headers,
            timeout=30.0,
        )
        if resp.status_code in (200, 201):
            public_url = f"{supabase_url}/storage/v1/object/public/{object_path}"
            logger.debug("Clips: uploaded %s (status=%d)", object_path, resp.status_code)
            return public_url
        else:
            logger.error(
                "Clips: upload failed for %s — status=%d, body=%s",
                object_path, resp.status_code, resp.text[:300],
            )
            return None
    except Exception:
        logger.exception("Clips: upload error for %s", object_path)
        return None


def _find_pause_points(vad_segments: list[dict]) -> list[tuple[float, float]]:
    """Extract natural pause points from VAD data.

    A pause is an explicit silence segment or an implicit gap between two
    consecutive VAD segments.  Returns ``(start, end)`` tuples sorted by
    start time, filtered to only include gaps >= ``_MIN_PAUSE_FOR_SNAP_S``.
    """
    if not vad_segments:
        return []

    pauses: list[tuple[float, float]] = []
    sorted_segs = sorted(vad_segments, key=lambda s: s["start"])

    # Explicit silence segments
    for seg in sorted_segs:
        if seg.get("type") == "silence":
            pauses.append((float(seg["start"]), float(seg["end"])))

    # Implicit gaps between consecutive VAD segments
    for i in range(len(sorted_segs) - 1):
        gap_start = float(sorted_segs[i]["end"])
        gap_end = float(sorted_segs[i + 1]["start"])
        if gap_end - gap_start >= _MIN_PAUSE_FOR_SNAP_S:
            pauses.append((gap_start, gap_end))

    pauses = [(s, e) for s, e in pauses if e - s >= _MIN_PAUSE_FOR_SNAP_S]
    pauses.sort(key=lambda p: p[0])
    return pauses


def _nearest_pause_point(
    boundary: float,
    pauses: list[tuple[float, float]],
) -> float:
    """Find the best point within the nearest pause to snap a boundary to.

    Returns the midpoint of the closest qualifying pause (within
    ``_SNAP_SEARCH_WINDOW_S``), or the original *boundary* if no pause is
    close enough.
    """
    best = boundary
    best_dist = _SNAP_SEARCH_WINDOW_S  # hard limit

    for pause_start, pause_end in pauses:
        mid = (pause_start + pause_end) / 2.0
        dist = abs(mid - boundary)
        if dist < best_dist:
            best_dist = dist
            best = mid

    return best


def _snap_llm_boundaries(
    llm_segments: list[dict],
    vad_segments: list[dict],
) -> list[dict]:
    """Adjust LLM segment boundaries to fall at natural pauses.

    For each *internal* boundary (the junction between two consecutive LLM
    segments), the nearest silence gap from the VAD data is found and the
    boundary is shifted there.  The very first start and very last end are
    left untouched.

    If snapping would make either neighbouring segment shorter than
    ``_MIN_CLIP_DURATION_S``, that boundary is left unchanged.
    """
    if len(llm_segments) < 2 or not vad_segments:
        return llm_segments

    pauses = _find_pause_points(vad_segments)
    if not pauses:
        logger.debug("Clips: no pause points found in VAD data — skipping boundary snap")
        return llm_segments

    adjusted = [dict(seg) for seg in llm_segments]

    for i in range(len(adjusted) - 1):
        original = adjusted[i]["end_seconds"]
        snapped = _nearest_pause_point(original, pauses)

        if snapped == original:
            continue

        # Guard: don't create segments that are too short
        seg_start = adjusted[i]["start_seconds"]
        next_end = adjusted[i + 1]["end_seconds"]

        if (snapped - seg_start) < _MIN_CLIP_DURATION_S:
            logger.debug(
                "Clips: skipping snap at %.1fs→%.1fs — would make segment %d too short",
                original, snapped, i,
            )
            continue
        if (next_end - snapped) < _MIN_CLIP_DURATION_S:
            logger.debug(
                "Clips: skipping snap at %.1fs→%.1fs — would make segment %d too short",
                original, snapped, i + 1,
            )
            continue

        logger.info(
            "Clips: snapped boundary %.1fs → %.1fs (shifted %.1fs to nearest pause)",
            original, snapped, snapped - original,
        )
        adjusted[i]["end_seconds"] = round(snapped, 3)
        adjusted[i + 1]["start_seconds"] = round(snapped, 3)

    return adjusted


def _groups_from_llm_segments(llm_segments: list[dict]) -> list[ClipGroup]:
    """Convert LLM topic segments into ClipGroups.

    Each LLM segment becomes exactly one clip. The label is stored on the
    ClipGroup so it can be included in clip metadata.

    Returns an empty list if anything is wrong with the input.
    """
    groups: list[ClipGroup] = []
    for seg in llm_segments:
        try:
            start = float(seg["start_seconds"])
            end = float(seg["end_seconds"])
            label = str(seg.get("label", "")).strip()
        except (KeyError, TypeError, ValueError):
            continue
        if end <= start:
            continue
        g = ClipGroup(start=start, end=end, types={"speech", "music"})
        g.label = label  # type: ignore[attr-defined]
        groups.append(g)
    return groups


def run_clips(
    lesson_id: uuid.UUID,
    audio_file_path: str,
    vad_segments: list[dict],
    supabase_url: str,
    service_role_key: str,
    llm_segments: list[dict] | None = None,
) -> list[dict]:
    """Process audio into clips and upload to Supabase Storage.

    Parameters
    ----------
    lesson_id:
        The lesson's primary key, used for storage paths.
    audio_file_path:
        Path to the raw audio file on disk.
    vad_segments:
        VAD segment list from the lesson record.
    supabase_url:
        Supabase project URL.
    service_role_key:
        Supabase service role key for storage uploads.
    llm_segments:
        Optional topic segments from the narrative LLM. When provided, each
        segment becomes one clip with a descriptive label instead of the
        default gap-based grouping.

    Returns
    -------
    list[dict]
        Clip metadata list. Empty list on any failure.
    """
    t0 = time.time()
    logger.info("Clips[%s]: starting — %d VAD segments", lesson_id, len(vad_segments))

    try:
        # Verify audio file exists
        if not os.path.exists(audio_file_path):
            logger.error("Clips[%s]: audio file not found at %s", lesson_id, audio_file_path)
            return []

        # Use LLM topic segments when available, fall back to gap-based grouping
        if llm_segments:
            # Snap LLM boundaries to natural pauses so clips don't cut
            # mid-speech.  Uses VAD silence data to find nearby gaps.
            snapped = _snap_llm_boundaries(llm_segments, vad_segments)
            clip_groups = _groups_from_llm_segments(snapped)
            if clip_groups:
                logger.info("Clips[%s]: using %d LLM topic segments as clip boundaries", lesson_id, len(clip_groups))
            else:
                logger.warning("Clips[%s]: LLM segments invalid, falling back to gap-based grouping", lesson_id)
                clip_groups = group_segments_into_clips(vad_segments)
        else:
            clip_groups = group_segments_into_clips(vad_segments)

        if not clip_groups:
            logger.warning("Clips[%s]: no non-silence clips found", lesson_id)
            return []

        # --- Clamp clip boundaries to actual audio duration ---
        audio_duration = _get_audio_duration(audio_file_path)
        if audio_duration is not None and audio_duration > 0:
            logger.info("Clips[%s]: audio file duration is %.1fs", lesson_id, audio_duration)
            clamped: list[ClipGroup] = []
            for g in clip_groups:
                if g.start >= audio_duration:
                    logger.warning(
                        "Clips[%s]: dropping clip starting at %.1fs — past audio end (%.1fs)",
                        lesson_id, g.start, audio_duration,
                    )
                    continue
                if g.end > audio_duration:
                    logger.info(
                        "Clips[%s]: clamping clip end from %.1fs to %.1fs (audio duration)",
                        lesson_id, g.end, audio_duration,
                    )
                    g.end = audio_duration
                if g.duration < _MIN_CLIP_DURATION_S:
                    logger.warning(
                        "Clips[%s]: dropping clip at %.1fs — too short after clamping (%.2fs)",
                        lesson_id, g.start, g.duration,
                    )
                    continue
                clamped.append(g)
            clip_groups = clamped
        else:
            logger.warning("Clips[%s]: could not probe audio duration — clips may have inaccurate durations", lesson_id)

        if not clip_groups:
            logger.warning("Clips[%s]: no clips remaining after clamping to audio duration", lesson_id)
            return []

        logger.info("Clips[%s]: %d clip groups from %d VAD segments", lesson_id, len(clip_groups), len(vad_segments))

        metadata: list[dict] = []
        temp_dir = tempfile.mkdtemp(prefix="orpheus_clips_")

        try:
            for idx, group in enumerate(clip_groups):
                clip_path = os.path.join(temp_dir, f"clip_{idx:03d}.webm")

                # Slice audio
                if not _slice_audio(audio_file_path, group.start, group.end, clip_path):
                    logger.warning("Clips[%s]: skipping clip %d — slice failed", lesson_id, idx)
                    continue

                # Read clip bytes for upload
                with open(clip_path, "rb") as f:
                    clip_bytes = f.read()

                # Upload to Supabase Storage
                public_url = _upload_clip(
                    clip_bytes, lesson_id, idx, supabase_url, service_role_key,
                )
                if public_url is None:
                    logger.warning("Clips[%s]: skipping clip %d — upload failed", lesson_id, idx)
                    continue

                clip_meta: dict = {
                    "index": idx,
                    "start": round(group.start, 3),
                    "end": round(group.end, 3),
                    "duration": round(group.duration, 3),
                    "types": sorted(group.types - {"silence"}),
                    "url": public_url,
                }
                # Include LLM-generated label when available
                label = getattr(group, "label", None)
                if label:
                    clip_meta["label"] = label

                metadata.append(clip_meta)

                # Clean up temp clip file immediately
                try:
                    os.unlink(clip_path)
                except OSError:
                    pass

        finally:
            # Clean up temp directory
            try:
                for f in os.listdir(temp_dir):
                    os.unlink(os.path.join(temp_dir, f))
                os.rmdir(temp_dir)
            except OSError:
                pass

        elapsed = time.time() - t0
        logger.info(
            "Clips[%s]: done in %.1fs — %d clips uploaded out of %d groups",
            lesson_id, elapsed, len(metadata), len(clip_groups),
        )

        return metadata

    except Exception:
        logger.exception("Clips[%s]: failed — returning empty list", lesson_id)
        return []
