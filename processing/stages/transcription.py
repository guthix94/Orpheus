"""Whisper transcription via the Groq API.

Sends an audio file to Groq's whisper-large-v3 endpoint and returns
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


def transcribe(
    audio_path: str | Path,
    api_key: str | None = None,
    prompt: str | None = None,
    audio_file_override: str | Path | None = None,
) -> TranscriptionResult:
    """Transcribe *audio_path* using the Groq Whisper API.

    Parameters
    ----------
    audio_path:
        Path to the original audio file (used for logging and as fallback).
    api_key:
        Groq API key.  If *None*, the client reads the ``GROQ_API_KEY``
        environment variable.
    prompt:
        Optional prompt to guide Whisper transcription (e.g. domain-specific
        vocabulary).  Groq's limit is 224 tokens.
    audio_file_override:
        Optional path to a pre-processed audio file (e.g. speech-only from
        VAD).  If provided, this file is sent to Whisper instead of
        *audio_path*.
    """
    from groq import Groq

    audio_path = Path(audio_path)
    actual_path = Path(audio_file_override) if audio_file_override else audio_path
    if not actual_path.exists():
        raise FileNotFoundError(f"Audio file not found: {actual_path}")

    client = Groq(api_key=api_key) if api_key else Groq()

    if audio_file_override:
        logger.info("Transcribing %s (VAD speech-only override) via Groq whisper-large-v3", actual_path)
    else:
        logger.info("Transcribing %s via Groq whisper-large-v3", audio_path)
    t0 = time.time()

    create_kwargs: dict = dict(
        file=(actual_path.name, audio_file_handle := open(actual_path, "rb")),
        model="whisper-large-v3",
        response_format="verbose_json",
    )
    if prompt is not None:
        create_kwargs["prompt"] = prompt

    try:
        result = client.audio.transcriptions.create(**create_kwargs)
    finally:
        audio_file_handle.close()

    elapsed = time.time() - t0
    logger.info("Transcription completed in %.1fs", elapsed)

    segments: list[TranscriptSegment] = []
    if result.segments:
        for seg in result.segments:
            text = seg.get("text", "").strip() if isinstance(seg, dict) else getattr(seg, "text", "").strip()
            if not text:
                continue
            start = seg.get("start", 0.0) if isinstance(seg, dict) else getattr(seg, "start", 0.0)
            end = seg.get("end", 0.0) if isinstance(seg, dict) else getattr(seg, "end", 0.0)
            segments.append(TranscriptSegment(start=start, end=end, text=text))

    full_text = result.text or ""
    language = getattr(result, "language", "") or ""

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
