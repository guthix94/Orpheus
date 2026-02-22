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


def transcribe(audio_path: str | Path, api_key: str | None = None) -> TranscriptionResult:
    """Transcribe *audio_path* using the Groq Whisper API.

    Parameters
    ----------
    audio_path:
        Path to the audio file (wav, webm, mp3, etc.).
    api_key:
        Groq API key.  If *None*, the client reads the ``GROQ_API_KEY``
        environment variable.
    """
    from groq import Groq

    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    client = Groq(api_key=api_key) if api_key else Groq()

    logger.info("Transcribing %s via Groq whisper-large-v3", audio_path)
    t0 = time.time()

    with open(audio_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            file=(audio_path.name, audio_file),
            model="whisper-large-v3",
            response_format="verbose_json",
        )

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
