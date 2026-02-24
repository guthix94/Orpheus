# VAD requires ffmpeg — bundled via imageio-ffmpeg pip package
"""Main pipeline orchestrator — runs all processing stages in order.

Pipeline (speech-to-summary with VAD pre-processing):
  0. Silero VAD — classify audio as speech/music/silence, extract speech-only
  1. Whisper transcription (on speech-only audio when VAD succeeds)
  2. Timestamp remapping (speech-only time → real lesson time)
  3. Claude narrative generation
  4. Persist results to the lesson row

Runs synchronously in a background thread so it doesn't block the API
response.  Heavy ML stages (VAD, Whisper) are CPU-bound; the Claude API call
is IO-bound — both are fine in a thread for MVP throughput.
"""

from __future__ import annotations

import logging
import os
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
    """Execute the speech-to-summary pipeline for a lesson.

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

    # Track temp file for cleanup
    speech_audio_temp_path: str | None = None

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

        # ---- Stage 0: VAD Pre-processing ----
        vad_result = None
        vad_duration = 0.0
        vad_status = "skipped"  # skipped | used | no_speech | failed | error

        if audio_path:
            from processing.stages.vad import run_vad

            logger.info("Pipeline[%s]: starting VAD pre-processing", lesson_id)
            t0 = time.time()
            try:
                vad_result = run_vad(audio_path)
                vad_duration = time.time() - t0

                if vad_result is not None:
                    # Store VAD segments on the lesson record
                    lesson.vad_segments = [s.to_dict() for s in vad_result.segments]
                    session.commit()

                    if vad_result.speech_audio_path:
                        speech_audio_temp_path = vad_result.speech_audio_path
                        vad_status = "used"
                        logger.info(
                            "Pipeline[%s]: VAD done in %.1fs — speech: %.1fs of %.1fs total",
                            lesson_id,
                            vad_duration,
                            vad_result.speech_duration_s,
                            vad_result.original_duration_s,
                        )
                    else:
                        vad_status = "no_speech"
                        logger.warning(
                            "Pipeline[%s]: VAD found no speech (status=no_speech, %.1fs elapsed) "
                            "— will send full audio to Whisper",
                            lesson_id,
                            vad_duration,
                        )
                        vad_result = None
                else:
                    vad_status = "failed"
                    logger.warning(
                        "Pipeline[%s]: VAD returned None (status=failed, %.1fs elapsed) "
                        "— falling back to full audio",
                        lesson_id,
                        vad_duration,
                    )
            except Exception:
                logger.exception("Pipeline[%s]: VAD failed — falling back to full audio", lesson_id)
                vad_status = "error"
                vad_result = None
                vad_duration = time.time() - t0

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
                    audio_file_override=speech_audio_temp_path,
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

        # ---- Stage 1.5: Timestamp remapping ----
        # When VAD was used, Whisper timestamps are in speech-only audio time.
        # Remap them back to real lesson time.
        if vad_result is not None and vad_result.timestamp_mappings and transcript_segments:
            from processing.stages.vad import remap_transcript_segments

            logger.info(
                "Pipeline[%s]: remapping %d transcript segments to real lesson time",
                lesson_id,
                len(transcript_segments),
            )
            transcript_segments = remap_transcript_segments(
                transcript_segments, vad_result.timestamp_mappings
            )

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

            # ---- Stage 3: Audio Clips ----
            # Run after narrative generation. Only if VAD segments and audio exist.
            clips_metadata: list[dict] = []
            clips_duration = 0.0
            if audio_path and lesson.vad_segments:
                from processing.stages.clips import run_clips

                logger.info("Pipeline[%s]: starting clips processing", lesson_id)
                t0 = time.time()
                try:
                    clips_metadata = run_clips(
                        lesson_id=lesson_id,
                        audio_file_path=audio_path,
                        vad_segments=lesson.vad_segments,
                        supabase_url=settings.supabase_url,
                        service_role_key=settings.supabase_service_role_key,
                    )
                    clips_duration = time.time() - t0
                    logger.info(
                        "Pipeline[%s]: clips done in %.1fs — %d clips",
                        lesson_id, clips_duration, len(clips_metadata),
                    )
                except Exception:
                    logger.exception("Pipeline[%s]: clips stage failed — continuing without clips", lesson_id)
                    clips_duration = time.time() - t0

                if clips_metadata:
                    lesson.clips = clips_metadata

                    # Delete raw audio from Railway disk now that clips are in Supabase
                    try:
                        os.remove(audio_path)
                        logger.info("Pipeline[%s]: deleted raw audio %s", lesson_id, audio_path)
                    except OSError:
                        logger.warning(
                            "Pipeline[%s]: failed to delete raw audio %s",
                            lesson_id, audio_path,
                        )

            # Build processing metadata
            metadata: dict = {
                "pipeline_version": "vad-speech-to-summary",
                "whisper_model": "groq/whisper-large-v3",
                "vad_seconds": round(vad_duration, 2),
                "vad_used": vad_result is not None,
                "vad_status": vad_status,
                "transcription_seconds": round(transcription_duration, 2),
                "narrative_seconds": round(narrative_duration, 2),
                "clips_seconds": round(clips_duration, 2),
                "clips_count": len(clips_metadata),
                "total_seconds": round(time.time() - pipeline_start, 2),
                "transcript_length": len(transcript_text),
            }
            if vad_result is not None:
                metadata["vad_speech_duration_s"] = round(vad_result.speech_duration_s, 2)
                metadata["vad_original_duration_s"] = round(vad_result.original_duration_s, 2)
                metadata["vad_segment_count"] = len(vad_result.segments)

            lesson.processing_metadata = metadata
            lesson.status = "completed"

        except Exception:
            logger.exception("Pipeline[%s]: narrative generation failed", lesson_id)
            lesson.status = "failed"
            lesson.processing_metadata = {
                "pipeline_version": "vad-speech-to-summary",
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
        # Clean up temp speech-only audio file
        if speech_audio_temp_path:
            try:
                os.unlink(speech_audio_temp_path)
                logger.debug("Pipeline[%s]: cleaned up temp file %s", lesson_id, speech_audio_temp_path)
            except OSError:
                logger.warning("Pipeline[%s]: failed to clean up temp file %s",
                               lesson_id, speech_audio_temp_path)
        session.close()
        engine.dispose()
