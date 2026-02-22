"""Whisper: speech to timestamped text.

Runs the openai-whisper package on an audio file and returns
a list of transcript segments with timestamps.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


@dataclass
class TranscriptionResult:
    segments: list[TranscriptSegment] = field(default_factory=list)
    full_text: str = ""
    language: str = ""
    duration_seconds: float = 0.0


def transcribe(audio_path: str | Path, model_size: str = "base") -> TranscriptionResult:
    """Run Whisper on *audio_path* and return structured transcript.

    Parameters
    ----------
    audio_path:
        Path to the audio file (wav, webm, mp3, etc.).
    model_size:
        Whisper model variant — tiny / base / small / medium / large-v3.
    """
    import whisper  # heavy import, deferred so server startup stays fast

    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    logger.info("Loading Whisper model '%s'", model_size)
    t0 = time.time()
    model = whisper.load_model(model_size)
    logger.info("Whisper model loaded in %.1fs", time.time() - t0)

    logger.info("Transcribing %s", audio_path)
    t0 = time.time()
    result = model.transcribe(
        str(audio_path),
        word_timestamps=False,
        verbose=False,
    )
    elapsed = time.time() - t0
    logger.info("Transcription completed in %.1fs", elapsed)

    segments = [
        TranscriptSegment(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
        )
        for seg in result.get("segments", [])
        if seg["text"].strip()
    ]

    full_text = " ".join(s.text for s in segments)
    language = result.get("language", "")

    logger.info(
        "Transcript: %d segments, %d chars, language=%s",
        len(segments),
        len(full_text),
        language,
    )

    return TranscriptionResult(
        segments=segments,
        full_text=full_text,
        language=language,
        duration_seconds=elapsed,
    )
