"""Main pipeline orchestrator — runs all processing stages in order.

MVP pipeline (speech-to-summary):
  1. Whisper transcription
  2. Claude narrative generation
  3. Persist results to the lesson row

Runs synchronously in a background thread so it doesn't block the API
response.  Heavy ML stages (Whisper) are CPU-bound; the Claude API call
is IO-bound — both are fine in a thread for MVP throughput.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from server.config import settings

logger = logging.getLogger(__name__)

_WHISPER_PROMPT_BASE = (
    "This is a music lesson. Common terms: Vivaldi, Bach, Mozart, Beethoven, "
    "Handel, Suzuki, Kreutzer, Wohlfahrt, Schradieck, spiccato, legato, "
    "staccato, détaché, vibrato, pizzicato, arco, forte, piano, crescendo, "
    "diminuendo, allegro, andante, adagio, measures, bars, tempo, metronome, "
    "intonation, position, first position, third position, bow hold, "
    "string crossing, scales, arpeggios, etude, concerto, sonata."
)

# Groq Whisper prompt limit is 224 tokens; keep well under that.
_WHISPER_PROMPT_MAX_CHARS = 800


def _format_timestamped_transcript(segments) -> str:
    """Format transcript segments as a timestamped transcript string.

    Each line looks like ``[M:SS] text`` or ``[MM:SS] text``.
    """
    lines: list[str] = []
    for seg in segments:
        start = seg.start if hasattr(seg, "start") else seg["start"]
        text = seg.text if hasattr(seg, "text") else seg["text"]
        minutes = int(start) // 60
        seconds = int(start) % 60
        lines.append(f"[{minutes}:{seconds:02d}] {text}")
    return "\n".join(lines)


def _build_whisper_prompt(student) -> str:
    """Build a Whisper prompt with domain vocabulary and student context."""
    parts = [_WHISPER_PROMPT_BASE]

    if student is not None:
        if student.current_pieces:
            pieces_str = ", ".join(student.current_pieces)
            parts.append(f"Pieces being studied: {pieces_str}.")
        parts.append(f"Student name: {student.name}.")

    prompt = " ".join(parts)
    if len(prompt) > _WHISPER_PROMPT_MAX_CHARS:
        prompt = prompt[:_WHISPER_PROMPT_MAX_CHARS].rsplit(" ", 1)[0]
    return prompt


def run_pipeline(lesson_id: uuid.UUID, database_url: str) -> None:
    """Execute the minimal speech-to-summary pipeline for a lesson.

    This is the top-level entry point called from the background task.
    It uses a **synchronous** SQLAlchemy session so it can run in a plain
    thread (FastAPI's ``BackgroundTasks`` executor).

    Parameters
    ----------
    lesson_id:
        Primary key of the lesson to process.
    database_url:
        Async database URL — we convert to sync (``postgresql://``)
        for this thread.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from server.models.lesson import Lesson
    from server.models.student import Student

    # Convert async URL to sync driver (psycopg2)
    sync_url = database_url.replace("+asyncpg", "")
    engine = create_engine(sync_url, echo=False)
    SessionLocal = sessionmaker(bind=engine)

    session: Session = SessionLocal()
    pipeline_start = time.time()

    try:
        # ---- Load lesson + student ----
        lesson = session.execute(
            select(Lesson).where(Lesson.id == lesson_id)
        ).scalar_one_or_none()

        if lesson is None:
            logger.error("Pipeline: lesson %s not found", lesson_id)
            return

        student = session.execute(
            select(Student).where(Student.id == lesson.student_id)
        ).scalar_one_or_none()

        student_name = student.name if student else "Unknown Student"
        instrument = student.instrument if student else "violin"

        audio_path = lesson.audio_file_path
        if not audio_path:
            logger.warning("Pipeline: no audio_file_path on lesson %s — skipping transcription",
                           lesson_id)

        # ---- Build Whisper prompt for transcription accuracy ----
        whisper_prompt = _build_whisper_prompt(student)

        # ---- Stage 1: Transcription ----
        transcript_text = ""
        transcript_segments: list[dict] = []
        transcription_duration = 0.0

        if audio_path:
            from processing.stages.transcription import transcribe

            logger.info("Pipeline[%s]: starting transcription", lesson_id)
            try:
                result = transcribe(
                    audio_path,
                    api_key=settings.groq_api_key or None,
                    prompt=whisper_prompt,
                )
                transcript_text = result.full_text
                transcript_segments = [asdict(s) for s in result.segments]
                transcription_duration = result.duration_seconds
                logger.info("Pipeline[%s]: transcription done — %d segments",
                            lesson_id, len(result.segments))
            except FileNotFoundError:
                logger.warning("Pipeline[%s]: audio file not found at %s", lesson_id, audio_path)
            except Exception:
                logger.exception("Pipeline[%s]: transcription failed", lesson_id)

        # ---- Query previous lesson for context ----
        previous_lesson_context: str | None = None
        try:
            prev_lesson = session.execute(
                select(Lesson)
                .where(
                    Lesson.student_id == lesson.student_id,
                    Lesson.status == "completed",
                    Lesson.id != lesson_id,
                )
                .order_by(Lesson.started_at.desc())
                .limit(1)
            ).scalar_one_or_none()

            if prev_lesson is not None:
                date_str = prev_lesson.started_at.strftime("%B %d, %Y")
                assignments_text = "None"
                if prev_lesson.suggested_assignments:
                    assignment_lines = []
                    for a in prev_lesson.suggested_assignments:
                        desc = a.get("description", "")
                        details = a.get("details", "")
                        line = f"- {desc}"
                        if details:
                            line += f": {details}"
                        assignment_lines.append(line)
                    assignments_text = "\n".join(assignment_lines)

                previous_lesson_context = (
                    f"Previous lesson ({date_str}):\n"
                    f"Summary: {prev_lesson.teacher_summary}\n"
                    f"Assignments given:\n{assignments_text}"
                )
                logger.info("Pipeline[%s]: found previous lesson from %s", lesson_id, date_str)
        except Exception:
            logger.exception("Pipeline[%s]: failed to query previous lesson", lesson_id)

        # ---- Format timestamped transcript for narrative ----
        if transcript_segments:
            timestamped_transcript = _format_timestamped_transcript(transcript_segments)
        else:
            timestamped_transcript = transcript_text

        # ---- Stage 2: Narrative generation ----
        logger.info("Pipeline[%s]: starting narrative generation", lesson_id)
        narrative_duration = 0.0
        try:
            from processing.stages.narrative import generate_summaries

            t0 = time.time()
            narrative = generate_summaries(
                transcript=timestamped_transcript,
                student_name=student_name,
                instrument=instrument,
                duration_seconds=lesson.duration_seconds,
                summary_style=lesson.summary_style,
                previous_lesson_context=previous_lesson_context,
                api_key=settings.anthropic_api_key or None,
            )
            narrative_duration = time.time() - t0
            logger.info("Pipeline[%s]: narrative generation done in %.1fs",
                         lesson_id, narrative_duration)

            # ---- Persist results ----
            lesson.teacher_summary = narrative.teacher_summary
            lesson.teacher_summary_formal = narrative.teacher_summary_formal
            lesson.parent_summary = narrative.parent_summary
            lesson.suggested_assignments = narrative.suggested_assignments
            lesson.pieces_detected = narrative.pieces_detected or []
            lesson.timeline_json = {
                "transcript_segments": transcript_segments,
            }
            lesson.processing_metadata = {
                "pipeline_version": "mvp-speech-to-summary",
                "whisper_model": "groq/whisper-large-v3",
                "transcription_seconds": round(transcription_duration, 2),
                "narrative_seconds": round(narrative_duration, 2),
                "total_seconds": round(time.time() - pipeline_start, 2),
                "transcript_length": len(transcript_text),
            }
            lesson.status = "completed"

        except Exception:
            logger.exception("Pipeline[%s]: narrative generation failed", lesson_id)
            lesson.status = "failed"
            lesson.processing_metadata = {
                "pipeline_version": "mvp-speech-to-summary",
                "error": "narrative_generation_failed",
                "total_seconds": round(time.time() - pipeline_start, 2),
            }

        session.commit()
        logger.info("Pipeline[%s]: finished — status=%s (%.1fs total)",
                     lesson_id, lesson.status, time.time() - pipeline_start)

    except Exception:
        logger.exception("Pipeline[%s]: unexpected error", lesson_id)
        try:
            lesson = session.execute(
                select(Lesson).where(Lesson.id == lesson_id)
            ).scalar_one_or_none()
            if lesson:
                lesson.status = "failed"
                lesson.processing_metadata = {"error": "pipeline_crashed"}
                session.commit()
        except Exception:
            logger.exception("Pipeline[%s]: failed to mark lesson as failed", lesson_id)
    finally:
        session.close()
        engine.dispose()
