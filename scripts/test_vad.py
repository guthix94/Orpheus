#!/usr/bin/env python3
"""Standalone CLI tool to test the VAD pipeline on a local audio file.

Usage:
    python scripts/test_vad.py my_test_lesson.mp3

Accepts .webm, .mp3, .wav, .m4a input formats.
No database, no API, no server — just runs VAD and prints results.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

# Add project root to path so we can import processing modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def format_timestamp(seconds: float) -> str:
    """Format seconds as M:SS or H:MM:SS."""
    total = int(round(seconds))
    if total >= 3600:
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h}:{m:02d}:{s:02d}"
    m = total // 60
    s = total % 60
    return f"{m}:{s:02d}"


def format_duration(seconds: float) -> str:
    """Format seconds as a human-friendly duration string like '8m 22s'."""
    total = int(round(seconds))
    if total >= 3600:
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h}h {m}m {s}s"
    if total >= 60:
        m = total // 60
        s = total % 60
        return f"{m}m {s}s"
    return f"{total}s"


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <audio_file>")
        print("  Supported formats: .webm, .mp3, .wav, .m4a")
        return 1

    audio_path = Path(sys.argv[1])

    if not audio_path.exists():
        print(f"Error: file not found: {audio_path}")
        return 1

    supported = {".webm", ".mp3", ".wav", ".m4a"}
    if audio_path.suffix.lower() not in supported:
        print(f"Error: unsupported format '{audio_path.suffix}'")
        print(f"  Supported: {', '.join(sorted(supported))}")
        return 1

    print(f"Running VAD on: {audio_path}")
    print()

    # Import here so startup errors are caught cleanly
    try:
        from processing.stages.vad import run_vad
    except ImportError as e:
        print(f"Error importing VAD module: {e}")
        print("Make sure you're running from the project root and dependencies are installed.")
        return 1

    result = run_vad(str(audio_path))

    if result is None:
        print("VAD FAILED — returned None (check logs above for details)")
        return 1

    # --- Print results ---

    print("=" * 60)
    print("VAD RESULTS")
    print("=" * 60)
    print()

    # Total duration
    print(f"Total audio duration: {format_duration(result.original_duration_s)} ({result.original_duration_s:.1f}s)")
    print()

    # Segment counts by type
    counts: dict[str, int] = {}
    durations: dict[str, float] = {}
    for seg in result.segments:
        counts[seg.type] = counts.get(seg.type, 0) + 1
        durations[seg.type] = durations.get(seg.type, 0.0) + (seg.end - seg.start)

    print("Segment counts:")
    for seg_type in ("speech", "music", "silence"):
        count = counts.get(seg_type, 0)
        dur = durations.get(seg_type, 0.0)
        print(f"  {seg_type:>8}: {count:3d} segments, {format_duration(dur):>10}")
    print(f"  {'total':>8}: {len(result.segments):3d} segments")
    print()

    # Speech percentage
    speech_dur = result.speech_duration_s
    total_dur = result.original_duration_s
    pct = (speech_dur / total_dur * 100) if total_dur > 0 else 0
    print(f"Speech: {format_duration(speech_dur)} / {format_duration(total_dur)} ({pct:.0f}%)")
    print()

    # Full segment list
    print("-" * 60)
    print("All segments:")
    print("-" * 60)
    for i, seg in enumerate(result.segments, 1):
        start = format_timestamp(seg.start)
        end = format_timestamp(seg.end)
        dur = seg.end - seg.start
        print(f"  {i:3d}. {start:>7} - {end:<7}  {seg.type.upper():<8}  ({dur:.1f}s)")
    print()

    # Save speech-only audio
    if result.speech_audio_path:
        output_path = Path("test_speech_only.wav")
        shutil.copy2(result.speech_audio_path, output_path)
        print(f"Speech-only audio saved to: {output_path.resolve()}")

        # Clean up the temp file created by run_vad
        temp = Path(result.speech_audio_path)
        if temp.exists():
            temp.unlink()
    else:
        print("No speech-only audio produced (no speech detected).")

    print()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
