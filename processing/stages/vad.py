"""Silero VAD pre-processing — strip non-speech audio before Whisper.

Loads a lesson audio file, runs Silero VAD to detect speech segments,
extracts speech-only audio, and builds a timestamp mapping table so
Whisper timestamps can be remapped back to real lesson time.

Key design decisions:
- Graceful degradation: if anything fails, returns None so the pipeline
  falls back to sending full audio to Whisper.
- Silero VAD requires 16kHz mono audio.
- Speech segments separated by < 300ms are merged to avoid over-splitting.
- Gaps between speech segments are classified as "music" (if they have
  sufficient audio energy) or "silence".
- The VAD model is loaded once and reused across calls within the same
  pipeline run.
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# Silero VAD operates at 16kHz
_VAD_SAMPLE_RATE = 16000

# Merge speech segments closer than this (seconds)
_MERGE_THRESHOLD_S = 0.3

# Silence gap inserted between speech segments in the concatenated audio (seconds)
_GAP_DURATION_S = 0.3

# RMS energy threshold to distinguish music from silence in non-speech gaps
_MUSIC_ENERGY_THRESHOLD = 0.005

# Minimum speech segment duration to keep (seconds) — filters VAD micro-detections
_MIN_SPEECH_DURATION_S = 0.15


@dataclass
class VADSegment:
    """A single segment of classified audio."""

    start: float  # seconds in real lesson time
    end: float  # seconds in real lesson time
    type: str  # "speech", "music", or "silence"

    def to_dict(self) -> dict:
        return {"start": round(self.start, 3), "end": round(self.end, 3), "type": self.type}


@dataclass
class TimestampMapping:
    """Maps a range in the speech-only audio back to real lesson time."""

    speech_start: float  # start in speech-only (trimmed) audio
    speech_end: float  # end in speech-only (trimmed) audio
    real_start: float  # corresponding start in real lesson audio
    real_end: float  # corresponding end in real lesson audio


@dataclass
class VADResult:
    """Complete result from the VAD stage."""

    segments: list[VADSegment] = field(default_factory=list)
    speech_audio_path: str | None = None  # path to temp speech-only audio file
    timestamp_mappings: list[TimestampMapping] = field(default_factory=list)
    original_duration_s: float = 0.0
    speech_duration_s: float = 0.0


def _load_vad_model():
    """Load the Silero VAD model via torch.hub."""
    import torch

    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        trust_repo=True,
    )
    get_speech_timestamps = utils[0]
    return model, get_speech_timestamps


def _convert_to_wav(audio_path: Path) -> Path:
    """Convert audio file to 16kHz mono WAV using ffmpeg.

    Ensures a consistent 16kHz mono WAV regardless of input format.

    Uses the static ffmpeg binary bundled with imageio-ffmpeg so that ffmpeg
    doesn't need to be installed at the OS level (e.g. on Railway/Railpack).
    """
    import imageio_ffmpeg

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    wav_path = Path(tempfile.mktemp(suffix=".wav"))
    cmd = [
        ffmpeg_path, "-y", "-i", str(audio_path),
        "-ar", str(_VAD_SAMPLE_RATE),
        "-ac", "1",
        "-f", "wav",
        str(wav_path),
    ]
    logger.debug("VAD: running ffmpeg — %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, timeout=120)
    if result.returncode != 0:
        stderr = result.stderr.decode(errors="replace")
        raise RuntimeError(f"ffmpeg conversion failed: {stderr[:500]}")

    # Validate output
    wav_size = wav_path.stat().st_size
    logger.debug("VAD: ffmpeg output — %s (%d bytes)", wav_path, wav_size)
    if wav_size < 44:  # WAV header is 44 bytes; anything less is empty
        raise RuntimeError(f"ffmpeg produced empty/invalid WAV ({wav_size} bytes) for {audio_path}")

    return wav_path


def _load_audio(audio_path: Path) -> tuple:
    """Load audio file and return (waveform_tensor, sample_rate).

    Always converts to 16kHz mono WAV via ffmpeg first (handles any input
    format), then loads with soundfile.  Returns a 1-D tensor at 16kHz.
    """
    import soundfile as sf
    import torch

    wav_path = None

    try:
        # Always convert via ffmpeg to guarantee 16kHz mono WAV
        wav_path = _convert_to_wav(audio_path)

        data, sr = sf.read(str(wav_path))  # numpy array: (samples,) or (samples, channels)
        waveform = torch.from_numpy(data).float()
        logger.debug(
            "VAD: soundfile.read — shape=%s, sr=%d, dtype=%s",
            list(waveform.shape), sr, waveform.dtype,
        )

        # soundfile returns (samples, channels) for multi-channel; average to mono
        if waveform.ndim > 1:
            waveform = waveform.mean(dim=-1)

        result_waveform = waveform  # 1-D, already 16kHz mono from ffmpeg

        # Log amplitude stats — critical for diagnosing "no speech detected"
        rms = (result_waveform.float() ** 2).mean().sqrt().item()
        logger.info(
            "VAD: audio loaded — %d samples (%.1fs), min=%.4f, max=%.4f, rms=%.6f",
            result_waveform.shape[0],
            result_waveform.shape[0] / _VAD_SAMPLE_RATE,
            result_waveform.min().item(),
            result_waveform.max().item(),
            rms,
        )
        if rms < 1e-6:
            logger.warning("VAD: audio appears to be silence/empty (rms=%.8f)", rms)

        return result_waveform, _VAD_SAMPLE_RATE

    finally:
        if wav_path and wav_path.exists():
            wav_path.unlink()


def _classify_gaps(
    speech_segments: list[VADSegment],
    waveform,
    sample_rate: int,
    total_duration: float,
) -> list[VADSegment]:
    """Fill gaps between speech segments with 'music' or 'silence' labels.

    Computes RMS energy of each gap to distinguish instrument playing
    (music) from actual silence.
    """
    all_segments: list[VADSegment] = []
    prev_end = 0.0

    for seg in speech_segments:
        if seg.start > prev_end + 0.01:
            gap_start = prev_end
            gap_end = seg.start
            gap_type = _classify_gap_energy(waveform, sample_rate, gap_start, gap_end)
            all_segments.append(VADSegment(start=gap_start, end=gap_end, type=gap_type))
        all_segments.append(seg)
        prev_end = seg.end

    # Handle trailing gap after last speech segment
    if prev_end < total_duration - 0.01:
        gap_type = _classify_gap_energy(waveform, sample_rate, prev_end, total_duration)
        all_segments.append(VADSegment(start=prev_end, end=total_duration, type=gap_type))

    return all_segments


def _classify_gap_energy(
    waveform, sample_rate: int, start: float, end: float
) -> str:
    """Classify a gap as 'music' or 'silence' based on RMS energy."""
    start_sample = int(start * sample_rate)
    end_sample = int(end * sample_rate)
    end_sample = min(end_sample, waveform.shape[0])

    if end_sample <= start_sample:
        return "silence"

    segment_audio = waveform[start_sample:end_sample].float()
    rms = (segment_audio ** 2).mean().sqrt().item()

    return "music" if rms > _MUSIC_ENERGY_THRESHOLD else "silence"


def _merge_close_speech_segments(
    segments: list[VADSegment], threshold_s: float = _MERGE_THRESHOLD_S
) -> list[VADSegment]:
    """Merge speech segments separated by less than threshold_s."""
    if not segments:
        return []

    merged: list[VADSegment] = [
        VADSegment(start=segments[0].start, end=segments[0].end, type="speech")
    ]

    for seg in segments[1:]:
        if seg.start - merged[-1].end < threshold_s:
            merged[-1].end = seg.end
        else:
            merged.append(VADSegment(start=seg.start, end=seg.end, type="speech"))

    return merged


def _extract_speech_audio(
    waveform,
    sample_rate: int,
    speech_segments: list[VADSegment],
) -> tuple[Path, list[TimestampMapping], float]:
    """Extract speech-only audio and build timestamp mapping table.

    Concatenates speech segments with 300ms silence gaps between them.
    Returns the temp file path, mapping table, and total speech duration.

    The mapping table allows converting Whisper timestamps (which are in
    the trimmed/concatenated audio time) back to real lesson time.
    """
    import torch

    chunks: list = []
    mappings: list[TimestampMapping] = []
    gap_samples = int(_GAP_DURATION_S * sample_rate)
    silence_gap = torch.zeros(gap_samples)
    current_pos = 0.0  # current position in speech-only audio

    for i, seg in enumerate(speech_segments):
        start_sample = int(seg.start * sample_rate)
        end_sample = int(seg.end * sample_rate)
        end_sample = min(end_sample, waveform.shape[0])

        if end_sample <= start_sample:
            continue

        segment_audio = waveform[start_sample:end_sample]
        segment_duration = segment_audio.shape[0] / sample_rate

        # Add gap before segment (except for the first one)
        if i > 0:
            chunks.append(silence_gap)
            current_pos += _GAP_DURATION_S

        # Record mapping: speech-only position -> real lesson position
        mappings.append(TimestampMapping(
            speech_start=current_pos,
            speech_end=current_pos + segment_duration,
            real_start=seg.start,
            real_end=seg.end,
        ))

        chunks.append(segment_audio)
        current_pos += segment_duration

    if not chunks:
        raise ValueError("No speech audio to extract")

    concatenated = torch.cat(chunks)
    total_speech_duration = concatenated.shape[0] / sample_rate

    # Save to temp file using soundfile (avoids torchaudio backend issues)
    import soundfile as sf

    temp_path = Path(tempfile.mktemp(suffix=".wav"))
    sf.write(str(temp_path), concatenated.numpy(), sample_rate)

    return temp_path, mappings, total_speech_duration


def remap_timestamp(trimmed_time: float, mappings: list[TimestampMapping]) -> float:
    """Convert a timestamp from speech-only audio time to real lesson time.

    Uses linear interpolation within each mapped segment. If the timestamp
    falls in a gap between segments (the 300ms silence), it maps to the
    boundary of the nearest segment.
    """
    if not mappings:
        return trimmed_time

    for m in mappings:
        if m.speech_start <= trimmed_time <= m.speech_end:
            # Linear interpolation within this segment
            if m.speech_end - m.speech_start < 0.001:
                return m.real_start
            ratio = (trimmed_time - m.speech_start) / (m.speech_end - m.speech_start)
            return m.real_start + ratio * (m.real_end - m.real_start)

    # Timestamp is in a gap or beyond all segments
    # Find the closest segment boundary
    if trimmed_time < mappings[0].speech_start:
        return mappings[0].real_start

    if trimmed_time > mappings[-1].speech_end:
        return mappings[-1].real_end

    # Between two mapped segments (in a silence gap)
    for i in range(len(mappings) - 1):
        if mappings[i].speech_end < trimmed_time < mappings[i + 1].speech_start:
            # Map to the end of the previous real segment
            return mappings[i].real_end

    return trimmed_time


def remap_transcript_segments(
    segments: list[dict],
    mappings: list[TimestampMapping],
) -> list[dict]:
    """Remap all transcript segment timestamps from speech-only time to real lesson time.

    Modifies segments in-place and returns them.
    """
    for seg in segments:
        seg["start"] = round(remap_timestamp(seg["start"], mappings), 3)
        seg["end"] = round(remap_timestamp(seg["end"], mappings), 3)
    return segments


def run_vad(audio_path: str | Path) -> VADResult | None:
    """Run Silero VAD on a lesson audio file.

    Returns a VADResult with classified segments, speech-only audio path,
    and timestamp mappings. Returns None if VAD fails for any reason
    (graceful degradation — pipeline falls back to full audio).

    The caller is responsible for cleaning up the temp speech audio file.
    """
    audio_path = Path(audio_path)

    if not audio_path.exists():
        logger.warning("VAD: audio file not found at %s", audio_path)
        return None

    t0 = time.time()
    logger.info("VAD: starting analysis of %s", audio_path)

    try:
        # Load audio
        waveform, sample_rate = _load_audio(audio_path)
        total_duration = waveform.shape[0] / sample_rate
        logger.info("VAD: loaded audio — %.1fs duration, %d Hz", total_duration, sample_rate)

        # Load Silero VAD model
        model, get_speech_timestamps = _load_vad_model()

        # Run VAD — returns list of dicts with 'start' and 'end' sample indices
        import torch

        speech_timestamps = get_speech_timestamps(
            waveform,
            model,
            sampling_rate=sample_rate,
            threshold=0.5,
            min_speech_duration_ms=int(_MIN_SPEECH_DURATION_S * 1000),
            min_silence_duration_ms=100,
        )

        logger.info(
            "VAD: get_speech_timestamps returned %d raw segments", len(speech_timestamps)
        )
        if speech_timestamps:
            for i, ts in enumerate(speech_timestamps[:5]):
                logger.debug(
                    "VAD:   raw segment %d: samples %d–%d (%.2f–%.2fs)",
                    i, ts["start"], ts["end"],
                    ts["start"] / sample_rate, ts["end"] / sample_rate,
                )
            if len(speech_timestamps) > 5:
                logger.debug("VAD:   ... and %d more segments", len(speech_timestamps) - 5)

        if not speech_timestamps:
            logger.warning("VAD: no speech detected in audio")
            return VADResult(
                segments=[VADSegment(start=0.0, end=total_duration, type="silence")],
                original_duration_s=total_duration,
                speech_duration_s=0.0,
            )

        # Convert sample indices to seconds and create speech segments
        raw_speech_segments = [
            VADSegment(
                start=ts["start"] / sample_rate,
                end=ts["end"] / sample_rate,
                type="speech",
            )
            for ts in speech_timestamps
        ]

        # Filter very short detections
        pre_filter_count = len(raw_speech_segments)
        raw_speech_segments = [
            s for s in raw_speech_segments
            if (s.end - s.start) >= _MIN_SPEECH_DURATION_S
        ]
        if pre_filter_count != len(raw_speech_segments):
            logger.info(
                "VAD: filtered %d/%d segments below %.0fms minimum duration",
                pre_filter_count - len(raw_speech_segments),
                pre_filter_count,
                _MIN_SPEECH_DURATION_S * 1000,
            )

        if not raw_speech_segments:
            logger.warning("VAD: all speech segments too short — no usable speech")
            return VADResult(
                segments=[VADSegment(start=0.0, end=total_duration, type="silence")],
                original_duration_s=total_duration,
                speech_duration_s=0.0,
            )

        # Merge close segments
        speech_segments = _merge_close_speech_segments(raw_speech_segments)

        # Classify gaps between speech segments as music or silence
        all_segments = _classify_gaps(speech_segments, waveform, sample_rate, total_duration)

        # Extract speech-only audio and build timestamp mapping
        speech_audio_path, mappings, speech_duration = _extract_speech_audio(
            waveform, sample_rate, speech_segments
        )

        elapsed = time.time() - t0
        speech_pct = (speech_duration / total_duration * 100) if total_duration > 0 else 0
        logger.info(
            "VAD: done in %.1fs — %d segments, %.1fs speech (%.0f%%) of %.1fs total",
            elapsed,
            len(all_segments),
            speech_duration,
            speech_pct,
            total_duration,
        )

        return VADResult(
            segments=all_segments,
            speech_audio_path=str(speech_audio_path),
            timestamp_mappings=mappings,
            original_duration_s=total_duration,
            speech_duration_s=speech_duration,
        )

    except Exception:
        logger.exception("VAD: failed — pipeline will use full audio")
        return None
