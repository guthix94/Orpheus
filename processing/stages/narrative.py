"""Claude API: generate teacher and parent summaries from a lesson transcript."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

import anthropic

logger = logging.getLogger(__name__)


@dataclass
class NarrativeResult:
    teacher_summary: str = ""
    teacher_summary_formal: str | None = None
    parent_summary: str = ""
    suggested_assignments: list[dict[str, str]] = field(default_factory=list)
    pieces_detected: list[str] = field(default_factory=list)


SYSTEM_PROMPT = """\
You are a music lesson documentation assistant for Orpheus.
You receive a transcript from a music lesson and generate summaries.

TEACHER SUMMARY: Concise, specific, uses musical terminology where present in
the transcript. Focus on what was covered, measurable progress, and areas
needing attention. Suggest 2-3 specific practice assignments based on what the
teacher discussed.

PARENT SUMMARY: Warm, encouraging, non-technical. Focus on effort and progress.
Give one specific thing the parent can encourage at home. Include recommended
daily practice duration.

NEVER use these words in the parent summary: struggled, failed, couldn't, wrong,
mistake, problem, weak, poor, bad, behind.

PIECES DETECTED: Extract any piece or song names mentioned in the transcript.

Respond in JSON format ONLY (no markdown fences):
{
    "teacher_summary": "...",
    "parent_summary": "...",
    "pieces_detected": ["..."],
    "suggested_assignments": [
        {"description": "...", "details": "..."}
    ]
}
"""

FORMAL_ADDENDUM = """
Additionally, generate a formal documentation-style record suitable for
professional or legal purposes. Use clinical, precise language. Structure as:
- Date, time, duration header
- Numbered list of content covered
- Observations section with objective technical notes
- Assignments given with specific targets

Add a "teacher_summary_formal" field to the JSON response.
"""


def generate_summaries(
    transcript: str,
    student_name: str,
    instrument: str = "violin",
    duration_seconds: int | None = None,
    summary_style: str = "standard",
    api_key: str | None = None,
) -> NarrativeResult:
    """Send the lesson transcript to Claude and parse the structured response.

    Parameters
    ----------
    transcript:
        Full text transcript of the lesson.
    student_name:
        Name of the student.
    instrument:
        Instrument being studied.
    duration_seconds:
        Lesson duration in seconds, if known.
    summary_style:
        "standard" or "formal".
    api_key:
        Anthropic API key. If *None*, the client reads ANTHROPIC_API_KEY env var.
    """
    if not transcript.strip():
        logger.warning("Empty transcript — returning placeholder summaries")
        return NarrativeResult(
            teacher_summary="No speech was detected in this lesson recording.",
            parent_summary=(
                f"{student_name} had a lesson today. "
                "Ask your teacher for details about what was covered."
            ),
        )

    system = SYSTEM_PROMPT
    if summary_style == "formal":
        system += FORMAL_ADDENDUM

    duration_str = ""
    if duration_seconds:
        mins = duration_seconds // 60
        duration_str = f"\nLesson duration: {mins} minutes"

    user_message = (
        f"Student: {student_name}\n"
        f"Instrument: {instrument}{duration_str}\n\n"
        f"Lesson transcript:\n{transcript}"
    )

    client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()

    logger.info("Sending transcript (%d chars) to Claude for narrative generation", len(transcript))

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = message.content[0].text
    logger.info("Received narrative response (%d chars)", len(raw))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Failed to parse Claude response as JSON: %s", raw[:200])
        return NarrativeResult(
            teacher_summary=raw,
            parent_summary=raw,
        )

    return NarrativeResult(
        teacher_summary=data.get("teacher_summary", ""),
        teacher_summary_formal=data.get("teacher_summary_formal"),
        parent_summary=data.get("parent_summary", ""),
        suggested_assignments=data.get("suggested_assignments", []),
        pieces_detected=data.get("pieces_detected", []),
    )
