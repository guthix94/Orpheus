# Orpheus — CLAUDE.md

## What This Project Is

**Orpheus** is an intelligent lesson documentation system for music educators. A music teacher taps "record" at the start of a lesson, teaches normally, taps "stop" at the end, and receives an auto-generated structured summary — what pieces were worked on, which sections, at what tempo, how many repetitions, week-over-week progress, plus a parent-friendly message they can send with one tap.

The system processes a single audio stream containing both teacher speech and student instrument playing. It separates these two streams, transcribes the speech, analyzes the music, aligns the music to a known score, and generates a unified lesson timeline. An LLM then converts this structured data into human-readable summaries.

This is NOT a generic meeting transcription tool. The core differentiator is that it understands music — it knows which measures the student played, at what tempo, with what intonation, and how that compares to last week.

**The Codex** is Orpheus's collective knowledge engine — a three-layer knowledge graph built from aggregated lesson data across thousands of teachers. It powers repertoire recommendations, technique dependency mapping, and evidence-based teaching approach suggestions. The Codex is the long-term platform play; Orpheus's lesson documentation is the daily utility that feeds it.

### Naming Hierarchy
```
Orpheus (the app — daily companion for music teachers)
├── Lesson Intelligence — auto-generated summaries, progress tracking
├── Parent Connect — one-tap parent communications
└── The Codex — collective teaching knowledge (knowledge graph)
    ├── Repertoire Graph — what to teach next
    ├── Technique Map — skill dependencies
    └── Teaching Insights — what approaches work best
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              CLIENT (Web App)                │
│  Record audio → Upload → View summaries      │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│              API SERVER (FastAPI)             │
│  Auth, lesson CRUD, student CRUD,            │
│  trigger processing, serve summaries         │
└──────────────────┬──────────────────────────┘
                   │ Task queue
┌──────────────────▼──────────────────────────┐
│         PROCESSING WORKER (Celery/RQ)        │
│                                              │
│  Pipeline stages (in order):                 │
│  1. Source separation (Demucs)               │
│  2. Speech transcription (Whisper)           │
│  3. NLP entity extraction (piece names)      │
│  4. Pitch detection (pYIN via librosa)       │
│  5. Chroma extraction (librosa)              │
│  6. Onset detection (librosa/madmom)         │
│  7. Beat/tempo tracking (madmom)             │
│  8. Lesson segmentation (silence detection)  │
│  9. Score alignment (DTW via librosa)        │
│  10. Intonation analysis (rule-based)        │
│  11. Behavior classification (rule-based)    │
│  12. Timeline merge (speech + music)         │
│  13. LLM narrative generation (Claude API)   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              DATA STORES                     │
│  PostgreSQL: students, lessons, summaries    │
│  File storage: temp audio, MusicXML scores   │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API server | Python 3.11+ / FastAPI | Audio analysis ecosystem is Python-native |
| Task queue | Celery with Redis (or RQ for simplicity in MVP) | Audio processing takes 3-5 min, must be async |
| Database | PostgreSQL (SQLite acceptable for early prototype) | Structured relational data, future graph queries |
| Audio analysis | librosa, madmom | Industry-standard open source, pip installable |
| Source separation | Demucs (torchaudio / Meta) | Best open-source source separation model |
| Speech-to-text | OpenAI Whisper (local, openai-whisper package) | Free, self-hosted, 99 languages |
| Pitch detection | librosa.pyin | Probabilistic YIN, robust and well-tested |
| Score format | music21 (for MusicXML/MIDI parsing) | Most comprehensive music theory library in Python |
| LLM | Anthropic Claude API | Narrative generation from structured data |
| Frontend | Next.js (web app, mobile-responsive) | Fast to build, works on phone browsers |
| Audio recording | MediaRecorder API (browser) | No native app needed for MVP |
| File storage | Local filesystem (S3 in production) | Process-and-delete pattern |
| Email | SendGrid API (or SMTP for MVP) | Parent communications |

## Project Structure

```
orpheus/
├── CLAUDE.md                    # This file
├── README.md
├── docker-compose.yml           # PostgreSQL, Redis
├── pyproject.toml               # Python dependencies
│
├── server/                      # FastAPI backend
│   ├── main.py                  # App entry point, CORS, lifespan
│   ├── config.py                # Environment variables, settings
│   ├── database.py              # SQLAlchemy setup, session management
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── student.py           # Student profile
│   │   ├── lesson.py            # Lesson record (with immutability)
│   │   ├── piece.py             # Musical piece metadata
│   │   ├── lesson_segment.py    # Individual segment within a lesson
│   │   ├── assignment.py        # Practice assignment with status tracking
│   │   ├── parent_message.py    # Parent communication log with delivery status
│   │   └── attendance.py        # Attendance/cancellation records
│   │
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── student.py
│   │   ├── lesson.py
│   │   ├── summary.py
│   │   ├── parent_message.py
│   │   └── export.py            # Student record export request/response
│   │
│   ├── api/                     # API route handlers
│   │   ├── students.py          # CRUD for students
│   │   ├── lessons.py           # Start/stop lesson, get summary, confirm/amend
│   │   ├── pieces.py            # Score database queries
│   │   ├── parents.py           # Parent message endpoints + communication log
│   │   ├── assignments.py       # Assignment tracking and status updates
│   │   └── export.py            # Student record export (PDF, JSON)
│   │
│   └── services/                # Business logic
│       ├── audio_upload.py      # Handle incoming audio files
│       ├── lesson_service.py    # Lesson lifecycle management
│       └── export_service.py    # Generate student record PDF exports
│
├── processing/                  # Audio processing pipeline
│   ├── pipeline.py              # Main orchestrator — runs all stages in order
│   ├── worker.py                # Celery/RQ worker entry point
│   │
│   ├── stages/                  # Each processing stage as a module
│   │   ├── source_separation.py # Demucs: split speech from instrument
│   │   ├── transcription.py     # Whisper: speech → timestamped text
│   │   ├── entity_extraction.py # Extract piece names from transcript
│   │   ├── pitch_detection.py   # pYIN: audio → pitch curve
│   │   ├── chroma_extraction.py # STFT → 12-dim chroma features
│   │   ├── onset_detection.py   # Spectral flux → note onset timestamps
│   │   ├── beat_tracking.py     # madmom: → beat positions + BPM
│   │   ├── segmentation.py      # Silence detection → lesson segments
│   │   ├── score_alignment.py   # DTW: student chroma ↔ reference chroma
│   │   ├── intonation.py        # Pitch deviation analysis + pattern detection
│   │   ├── behavior.py          # Classify: run-through, spot practice, etc.
│   │   ├── timeline_merge.py    # Combine speech + music into unified timeline
│   │   └── narrative.py         # Claude API → teacher + parent summaries
│   │
│   └── utils/
│       ├── audio_io.py          # Load/save/convert audio files
│       ├── confidence.py        # Confidence scoring utilities
│       └── music_theory.py      # Cents calculation, note naming, etc.
│
├── scores/                      # Score database
│   ├── loader.py                # Parse MusicXML/MIDI into internal format
│   ├── database.py              # Score lookup and matching
│   ├── chroma_cache.py          # Pre-computed chroma for reference scores
│   └── data/                    # MusicXML files (start with Suzuki violin)
│       ├── suzuki_book1/
│       ├── suzuki_book2/
│       └── ...
│
├── frontend/                    # Next.js web app
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx             # Landing / login
│   │   ├── lesson/
│   │   │   ├── record/page.tsx  # Record screen (student name + record button)
│   │   │   └── [id]/page.tsx    # Lesson summary view (confirm, amend, send)
│   │   ├── students/
│   │   │   ├── page.tsx         # Student list
│   │   │   ├── [id]/page.tsx    # Student profile + history
│   │   │   ├── [id]/record/page.tsx      # Student record (professional docs)
│   │   │   └── [id]/export/page.tsx      # Export student record as PDF
│   │   └── dashboard/
│   │       └── page.tsx         # Teacher dashboard
│   └── components/
│       ├── AudioRecorder.tsx     # MediaRecorder wrapper
│       ├── LessonSummary.tsx     # Summary display (standard + formal toggle)
│       ├── StudentCard.tsx       # Student list item
│       ├── ParentMessage.tsx     # Parent message preview + send
│       ├── CommunicationLog.tsx  # Scrollable log of all parent messages
│       ├── AssignmentTracker.tsx  # Assignment list with status indicators
│       └── ConfirmButton.tsx     # Lesson confirmation with lock behavior
│
├── tests/
│   ├── test_pipeline.py         # End-to-end pipeline tests
│   ├── test_alignment.py        # DTW alignment tests with known scores
│   ├── test_pitch.py            # Pitch detection accuracy tests
│   └── fixtures/                # Test audio files, reference scores
│       ├── sample_lesson.wav
│       ├── vivaldi_a_minor.musicxml
│       └── expected_output.json
│
└── scripts/
    ├── seed_scores.py           # Load initial score database
    ├── generate_chroma_cache.py # Pre-compute reference chromas
    └── simulate_lesson.py       # Generate test data
```

## Key Domain Concepts

### Lesson
A single recording session between a teacher and one student. Has a start time, end time, associated student, and produces a structured timeline and summary after processing.

### Segment
A continuous section of audio within a lesson, bounded by silence gaps. Each segment is classified as SPEECH, MUSIC, or SILENCE. Music segments are further aligned to score positions.

### Score Alignment
The process of mapping a student's audio to specific positions (measure numbers) in a known musical score, using Dynamic Time Warping (DTW) on chroma features.

### Chroma Features
A 12-dimensional representation of audio where each dimension corresponds to a pitch class (C, C#, D, ..., B), regardless of octave. This is the shared representation used to compare student audio against reference scores.

### Lesson Timeline
The final merged data structure combining speech transcript entries and music analysis entries in chronological order. This is the JSON that gets sent to the LLM for narrative generation.

### Summary
The human-readable output. Two versions: teacher-facing (specific, technical, includes measure numbers and tempos) and parent-facing (warm, encouraging, non-technical, actionable).

## Data Models

### Student
```python
class Student:
    id: UUID
    teacher_id: UUID
    name: str                        # First name, entered on first lesson
    instrument: str                  # Inherited from teacher's profile
    created_at: datetime
    # Everything below is populated progressively from lessons:
    current_pieces: list[str]        # Detected from lesson content
    estimated_level: str | None      # Inferred from repertoire
    notes: str | None                # Teacher's manual notes
    parent_email: str | None         # Added when teacher first sends a message
    parent_phone: str | None
```

### Lesson
```python
class Lesson:
    id: UUID
    student_id: UUID
    teacher_id: UUID
    started_at: datetime
    ended_at: datetime
    duration_seconds: int
    audio_file_path: str | None      # Temporary, deleted after processing
    status: str                      # "recording", "processing", "completed", "failed"
    summary_style: str               # "standard" or "formal" (teacher preference)
    # Populated after processing:
    pieces_detected: list[str]       # Piece names found in this lesson
    timeline_json: dict              # Full merged timeline
    teacher_summary: str             # LLM-generated teacher summary
    teacher_summary_formal: str | None  # Formal/clinical version (if formal mode)
    parent_summary: str              # LLM-generated parent summary
    suggested_assignments: list[dict]
    processing_metadata: dict        # Confidence scores, processing time, etc.
    # Immutability:
    confirmed_at: datetime | None    # When teacher confirmed the summary
    is_locked: bool                  # True after confirmation — no edits to original
    amendments: list[dict] | None    # Timestamped teacher notes added after confirmation
```

### LessonSegment
```python
class LessonSegment:
    id: UUID
    lesson_id: UUID
    segment_type: str                # "speech", "music", "silence"
    start_time: float                # Seconds from lesson start
    end_time: float
    # For speech segments:
    transcript: str | None
    speaker: str | None              # "teacher" or "student" (best guess)
    # For music segments:
    piece_id: UUID | None            # Matched piece, if identified
    measures_start: int | None       # Score position start
    measures_end: int | None         # Score position end
    avg_tempo: float | None          # BPM
    alignment_confidence: float | None  # 0.0 - 1.0
    repetition_number: int | None    # Which repetition of this section
    intonation_avg_cents: float | None  # Average deviation from expected pitch
```

### Piece (Score Database)
```python
class Piece:
    id: UUID
    title: str                       # "Concerto in A minor"
    composer: str                    # "Vivaldi"
    catalog_number: str | None       # "RV 356"
    movement: str | None             # "Mvt. 1"
    instrument: str                  # "violin"
    difficulty_level: str | None     # "intermediate"
    source: str                      # "suzuki_book4", "imslp", "community", "omr_scan"
    score_file_path: str             # Path to MusicXML file
    chroma_cache_path: str | None    # Pre-computed reference chroma (numpy file)
    total_measures: int
    estimated_duration_seconds: int
    key_signature: str | None
    time_signature: str | None
    search_aliases: list[str]        # ["vivaldi", "vivaldi a minor", "rv 356"]
```

### ParentMessage (Communication Log)
```python
class ParentMessage:
    id: UUID
    lesson_id: UUID
    student_id: UUID
    teacher_id: UUID
    # Content:
    message_body: str                # Exact text that was sent
    message_type: str                # "lesson_summary", "progress_report", "custom"
    # Delivery:
    channel: str                     # "email" or "sms"
    recipient: str                   # Email address or phone number
    sent_at: datetime
    delivered_at: datetime | None    # Delivery confirmation timestamp
    delivery_status: str             # "sent", "delivered", "failed", "bounced"
    # Immutable — once sent, the record cannot be altered
```

### AssignmentRecord (Practice Assignment Log)
```python
class AssignmentRecord:
    id: UUID
    lesson_id: UUID                  # Lesson where this was assigned
    student_id: UUID
    assigned_at: datetime
    description: str                 # "Measures 45-62, target ♩=80"
    details: str | None              # Additional context
    # Updated after subsequent lesson:
    status: str                      # "assigned", "achieved", "partially_achieved", "not_attempted"
    status_updated_at: datetime | None
    weeks_persisted: int             # How many consecutive weeks this was assigned
```

### AttendanceRecord (Auto-generated from lessons)
```python
class AttendanceRecord:
    student_id: UUID
    term: str                        # "2026-spring" or date range
    total_lessons: int
    total_minutes: int
    cancellations_student: int       # Student-initiated cancellations
    cancellations_teacher: int       # Teacher-initiated cancellations
    no_shows: int
    # Computed:
    attendance_rate: float           # Percentage of scheduled lessons attended
```

## Processing Pipeline — Detailed Implementation Notes

### Stage 1: Source Separation (Demucs)

```python
# Use the htdemucs model — best for vocal/instrument separation
# Input: single audio file (lesson recording)
# Output: two files — vocals (speech) and accompaniment (instrument)

import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model

model = get_model("htdemucs")
wav, sr = torchaudio.load("lesson.wav")
sources = apply_model(model, wav[None], device="cuda")
# sources shape: [1, num_sources, channels, samples]
# htdemucs sources: drums, bass, other, vocals
# We want: vocals (index 3) = speech, other (index 2) ≈ instrument
speech_audio = sources[0, 3]   # vocals track
instrument_audio = sources[0, 2]  # other track
```

**Important:** If CUDA/GPU is not available, Demucs runs on CPU but is much slower (~10x). For MVP on a development machine, consider processing shorter test files or using the smaller `htdemucs_ft` model.

### Stage 2: Speech Transcription (Whisper)

```python
import whisper

model = whisper.load_model("base")  # Use "small" or "medium" for better accuracy
result = model.transcribe("speech.wav", word_timestamps=True)

# result["segments"] contains timestamped transcript:
# [{"start": 0.0, "end": 3.2, "text": "Let's hear the Vivaldi"}, ...]
```

**Model size tradeoffs:**
- `tiny`: Fastest, least accurate. Good for testing.
- `base`: Good balance for MVP.
- `small`: Noticeably better accuracy, 2x slower than base.
- `medium`: Best practical accuracy, 5x slower than base.
- `large-v3`: Best accuracy, requires significant GPU memory.

### Stage 3: Entity Extraction

Search the transcript for piece names using fuzzy matching against the score database.

```python
# Simple approach: check each transcript segment for keywords
# that match piece titles, composers, or aliases in the database
from rapidfuzz import fuzz, process

def find_pieces_in_transcript(transcript_segments, piece_database):
    """
    Search transcript for references to known pieces.
    Returns list of (piece_id, confidence, transcript_segment).
    """
    matches = []
    all_aliases = []  # [(alias_string, piece_id), ...]
    for piece in piece_database:
        for alias in piece.search_aliases:
            all_aliases.append((alias, piece.id))

    for segment in transcript_segments:
        text = segment["text"].lower()
        # Check against all aliases with fuzzy matching
        results = process.extract(text, [a[0] for a in all_aliases],
                                  scorer=fuzz.partial_ratio, limit=3)
        for match_text, score, idx in results:
            if score > 80:  # Threshold for match confidence
                piece_id = all_aliases[idx][1]
                matches.append((piece_id, score / 100.0, segment))
    return matches
```

**For MVP:** Start simple with keyword matching. Get fancier later if needed.

### Stage 4-5: Pitch Detection and Chroma Extraction

```python
import librosa
import numpy as np

# Load the instrument audio
y, sr = librosa.load("instrument.wav", sr=22050)

# Pitch detection with pYIN
f0, voiced_flag, voiced_probs = librosa.pyin(
    y, fmin=librosa.note_to_hz('C2'),
    fmax=librosa.note_to_hz('C7'),
    sr=sr
)
# f0: array of fundamental frequency estimates (Hz), NaN for unvoiced frames
# voiced_flag: boolean array, True where voicing detected
# voiced_probs: confidence of voicing per frame

# Chroma features
chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
# chroma shape: (12, num_frames) — one 12-dim vector per time frame
# Each row = pitch class energy: C, C#, D, D#, E, F, F#, G, G#, A, A#, B

# Time axis for chroma frames
times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=512)
```

### Stage 6-7: Onset Detection and Beat Tracking

```python
import librosa

# Onset detection
onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512)
onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

# Beat tracking
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)
# tempo: estimated global BPM
# beat_times: array of timestamps where beats occur

# For per-segment tempo, compute local BPM from beat intervals:
def local_tempo(beat_times_segment):
    """Compute BPM from a sequence of beat timestamps."""
    if len(beat_times_segment) < 2:
        return None
    intervals = np.diff(beat_times_segment)
    avg_interval = np.mean(intervals)
    return 60.0 / avg_interval
```

**Note on madmom:** madmom's RNNBeatProcessor is more accurate than librosa's beat tracker for real-world music. However, madmom has stricter dependency requirements. For MVP, start with librosa. Swap in madmom later if beat tracking accuracy is insufficient.

```python
# madmom alternative (more accurate, use if librosa isn't good enough):
# pip install madmom
# from madmom.features.beats import RNNBeatProcessor, DBNBeatTrackingProcessor
# proc = DBNBeatTrackingProcessor(fps=100)
# act = RNNBeatProcessor()(audio_file)
# beat_times = proc(act)
```

### Stage 8: Segmentation

```python
import librosa
import numpy as np

def segment_lesson(y, sr, silence_threshold_db=-40, min_silence_duration=2.0):
    """
    Split lesson audio into segments based on silence gaps.
    Returns list of (start_time, end_time, segment_type).
    """
    # Compute RMS energy in short frames
    hop_length = 512
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    rms_db = librosa.amplitude_to_db(rms)
    times = librosa.frames_to_time(np.arange(len(rms_db)), sr=sr, hop_length=hop_length)

    # Find silence regions
    is_silent = rms_db < silence_threshold_db
    min_frames = int(min_silence_duration * sr / hop_length)

    segments = []
    current_start = 0
    in_silence = False
    silence_start = 0

    for i, silent in enumerate(is_silent):
        if silent and not in_silence:
            silence_start = i
            in_silence = True
        elif not silent and in_silence:
            if (i - silence_start) >= min_frames:
                # Long enough silence — create segment boundary
                if current_start < silence_start:
                    segments.append((times[current_start], times[silence_start], "content"))
                segments.append((times[silence_start], times[i], "silence"))
                current_start = i
            in_silence = False

    # Final segment
    if current_start < len(times):
        segments.append((times[current_start], times[-1], "content"))

    return segments
```

### Stage 9: Score Alignment (DTW)

This is the most critical and complex stage. It maps student audio to measure positions in the score.

```python
import librosa
import numpy as np

def align_to_score(student_chroma, reference_chroma, reference_measures):
    """
    Align student performance to a reference score using DTW.

    Args:
        student_chroma: (12, N) chroma features from student audio
        reference_chroma: (12, M) chroma features from reference score
        reference_measures: array of length M mapping each reference frame
                           to a measure number

    Returns:
        alignment: list of (student_time, measure_number, confidence)
    """
    # Compute DTW
    D, wp = librosa.sequence.dtw(
        X=student_chroma,
        Y=reference_chroma,
        metric='cosine'
    )
    # wp: warping path, array of (student_frame, reference_frame) pairs
    # D: accumulated cost matrix

    # Alignment confidence: normalized path cost
    path_cost = D[wp[-1, 0], wp[-1, 1]]
    path_length = len(wp)
    avg_cost = path_cost / path_length  # Lower = better alignment
    confidence = max(0.0, 1.0 - avg_cost)  # Simple confidence heuristic

    # Map student frames to measure numbers via the warping path
    alignment = []
    for student_frame, ref_frame in wp:
        measure = reference_measures[ref_frame]
        alignment.append((student_frame, measure))

    return alignment, confidence


def build_reference_chroma(score_file_path, sr=22050, hop_length=512):
    """
    Load a MusicXML file and synthesize reference chroma features.
    Uses music21 to parse the score and generate a MIDI-like representation,
    then computes chroma from the synthesized audio.
    """
    from music21 import converter, midi

    score = converter.parse(score_file_path)

    # Create measure number mapping
    # For each time position in the score, record the measure number
    measure_map = {}
    for part in score.parts:
        for measure in part.getElementsByClass('Measure'):
            measure_num = measure.number
            start_offset = measure.offset
            end_offset = start_offset + measure.duration.quarterLength
            measure_map[(start_offset, end_offset)] = measure_num

    # Export to MIDI and synthesize audio for chroma computation
    midi_file = midi.translate.streamToMidiFile(score)
    midi_file.open('/tmp/reference.mid', 'wb')
    midi_file.write()
    midi_file.close()

    # Load MIDI as audio using fluidsynth (or just compute chroma from MIDI directly)
    # Alternative: compute chroma directly from MIDI note events
    # This is more reliable than synthesizing audio:
    reference_chroma = compute_chroma_from_midi('/tmp/reference.mid', sr, hop_length)

    return reference_chroma, measure_map
```

**Important implementation note:** Computing reference chroma from MIDI note events directly (rather than synthesizing audio and then extracting chroma) is more reliable and faster. You create a "piano roll" matrix and project it down to 12 chroma bins.

### Stage 12: Timeline Merge

```python
def merge_timeline(speech_segments, music_segments):
    """
    Combine speech transcript and music analysis into a single
    chronological timeline.

    Returns a list of timeline entries sorted by start_time.
    """
    timeline = []

    for seg in speech_segments:
        timeline.append({
            "type": "speech",
            "start_time": seg["start"],
            "end_time": seg["end"],
            "text": seg["text"],
            "speaker": seg.get("speaker", "unknown")
        })

    for seg in music_segments:
        timeline.append({
            "type": "music",
            "start_time": seg["start_time"],
            "end_time": seg["end_time"],
            "measures_start": seg.get("measures_start"),
            "measures_end": seg.get("measures_end"),
            "avg_tempo": seg.get("avg_tempo"),
            "repetition_number": seg.get("repetition_number"),
            "alignment_confidence": seg.get("alignment_confidence"),
            "intonation_avg_cents": seg.get("intonation_avg_cents")
        })

    timeline.sort(key=lambda x: x["start_time"])
    return timeline
```

### Stage 13: LLM Narrative Generation

```python
import anthropic

def generate_summaries(lesson_timeline, student_name, piece_name,
                       previous_lesson=None, assignments=None,
                       summary_style="standard"):
    """
    Generate teacher summary and parent summary from structured lesson data.
    summary_style: "standard" (concise, conversational) or "formal" (clinical, for records)
    """
    client = anthropic.Anthropic()

    formal_instruction = ""
    if summary_style == "formal":
        formal_instruction = """
FORMAL TEACHER SUMMARY: Additionally, generate a formal documentation-style record
suitable for professional or legal purposes. Use clinical, precise language. Structure as:
- Date, time, duration header
- Numbered list of content covered with measure numbers and tempos
- Observations section with objective technical notes
- Assignments given with specific targets
- Previous assignment status (achieved/partially achieved/not attempted)
This record may be used as professional documentation. Be precise and factual.
Do NOT editorialize or use casual language in the formal version.
"""

    system_prompt = f"""You are a music lesson documentation assistant.
You receive structured data from a music lesson and generate summaries.

TEACHER SUMMARY: Concise, specific, uses musical terminology. Include measure
numbers and tempos. Focus on what was covered, measurable progress, and areas
needing attention. If previous lesson data is provided, highlight week-over-week
changes. Suggest 2-3 specific practice assignments.

PARENT SUMMARY: Warm, encouraging, non-technical. Focus on effort and progress.
Give one specific thing the parent can encourage at home. Include recommended
daily practice duration.

NEVER use these words in the parent summary: struggled, failed, couldn't, wrong,
mistake, problem, weak, poor, bad, behind.
{formal_instruction}
Respond in JSON format:
{{
    "teacher_summary": "...",
    "parent_summary": "...",
    {"\"teacher_summary_formal\": \"...\"," if summary_style == "formal" else ""}
    "suggested_assignments": [
        {{"description": "...", "details": "..."}},
    ]
}}"""

    user_message = f"""Student: {student_name}
Piece: {piece_name}

Lesson timeline:
{json.dumps(lesson_timeline, indent=2)}

{"Previous lesson data:" + json.dumps(previous_lesson, indent=2) if previous_lesson else "No previous lesson data available."}

{"Current assignments:" + json.dumps(assignments, indent=2) if assignments else "No current assignments."}
"""

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=2000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    return json.loads(message.content[0].text)
```

## Frontend — Key Screens

### Recording Screen
- Large, prominent record button (red circle, unmistakable)
- Student name input (autocomplete from known students, or type new name)
- During recording: student name, elapsed time, subtle pulsing indicator, stop button
- Minimal UI — teacher should forget the app exists while teaching

### Lesson Summary Screen
- Piece name and date at top
- Visual section map: which parts of the piece were worked on, how many times
- Tempo data per section (with delta from last week if available)
- Expandable teacher summary text (standard or formal, based on preference)
- "Send to parent" button with message preview
- "Edit assignments" option
- **Confirm button** — locks the summary as an immutable record
- After confirmation: teacher can add timestamped amendments but cannot edit the original
- Toggle between standard and formal documentation views

### Student List (Dashboard)
- Cards for each student showing: name, last lesson date, current piece, brief status
- Tapping a student shows their profile: lesson history, progress trends, current assignments
- Pre-lesson brief shown prominently for students with upcoming lessons

### Pre-Lesson Brief
- Shown when teacher taps a student to start a new lesson
- Shows: last lesson summary, assigned practice goals, key issues flagged
- One tap to "Start Lesson" from this screen

### Student Record (Professional Documentation)
- Complete view of a student's history with the teacher
- Tabs: Lesson History | Communication Log | Assignments | Progress
- **Lesson History:** Scrollable list of every lesson with date, duration, pieces, confirmed summaries
- **Communication Log:** Every parent message sent, with delivery status and timestamp
- **Assignments:** Running list of all assignments, status (achieved/partial/not attempted), persistence count
- **Progress:** Tempo trends, repertoire timeline, attendance statistics
- **Export button:** Generate a PDF of the complete student record, filterable by date range
- Export includes cover page with summary statistics: total lessons, attendance rate, pieces completed, measurable progress metrics

## Audio Recording in Browser

```typescript
// Core MediaRecorder setup for lesson recording
// Use AAC codec if available, fallback to webm/opus
const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,           // Mono
            sampleRate: 44100,         // Standard sample rate
            echoCancellation: false,   // Don't cancel — we want all audio
            noiseSuppression: false,   // Don't suppress — instrument is "noise"
            autoGainControl: false     // Don't auto-adjust — dynamic range matters
        }
    });

    // IMPORTANT: disable all browser audio processing
    // Browser defaults will try to suppress the instrument audio
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

    const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000
    });

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        uploadAudio(blob);
    };

    recorder.start(1000); // Collect in 1-second chunks
    return recorder;
};
```

**Critical:** Disable echoCancellation, noiseSuppression, and autoGainControl. Browser defaults are designed for voice calls and will aggressively filter out musical instrument sounds.

## Environment Variables

```bash
# .env file
DATABASE_URL=postgresql://orpheus:password@localhost:5432/orpheus
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
WHISPER_MODEL_SIZE=base          # tiny/base/small/medium/large-v3
DEMUCS_MODEL=htdemucs            # htdemucs or htdemucs_ft
AUDIO_STORAGE_PATH=./storage/audio
SCORES_PATH=./scores/data
SENDGRID_API_KEY=SG...           # Optional, for parent emails
```

## Development Workflow

### Getting Started
```bash
# 1. Clone and install Python deps
pip install fastapi uvicorn sqlalchemy asyncpg celery redis
pip install librosa madmom music21 openai-whisper
pip install torch torchaudio demucs
pip install anthropic rapidfuzz

# 2. Start infrastructure
docker-compose up -d  # PostgreSQL + Redis

# 3. Initialize database
python -m server.database init

# 4. Seed score database with initial repertoire
python scripts/seed_scores.py

# 5. Pre-compute reference chromas for all scores
python scripts/generate_chroma_cache.py

# 6. Start API server
uvicorn server.main:app --reload

# 7. Start processing worker
celery -A processing.worker worker --loglevel=info

# 8. Start frontend
cd frontend && npm install && npm run dev
```

### Testing Pipeline with Sample Audio
```bash
# Generate a test lesson (synthesized audio for pipeline testing)
python scripts/simulate_lesson.py --output test_lesson.wav

# Run pipeline on test audio
python -m processing.pipeline --input test_lesson.wav --student "Test Student"

# Or use a real recording for more realistic testing
```

## MVP Constraints and Scope

### In Scope (Build This)
- Single instrument: violin
- Score database: Suzuki violin Books 1-4 (~100 pieces)
- Audio recording via web browser on phone
- Basic source separation and speech transcription
- DTW score alignment with confidence scoring
- Tempo tracking per section
- Repetition counting
- LLM-generated teacher summary (standard + formal documentation mode)
- LLM-generated parent summary with one-tap send
- **Parent communication log with delivery timestamps and confirmation**
- **Assignment tracking with status (achieved/partial/not attempted)**
- **Lesson confirmation flow — locks summary as immutable record**
- **Student record export as PDF (filterable by date range)**
- Student list with lesson history
- Pre-lesson brief
- Week-over-week comparison (tempo deltas)

### Out of Scope (Build Later)
- Intonation pattern analysis (Phase 2)
- Practice behavior classification beyond basic repetition counting (Phase 2)
- OMR sheet music scanning (Phase 2)
- Reference recording alignment for pieces without scores (Phase 3)
- Piano and other instruments (Phase 2-3)
- Native mobile app (web-first for MVP)
- Monthly progress reports (Phase 3)
- Attendance analytics dashboard (Phase 2)
- Repertoire Graph recommendations (Phase 4 — The Codex)
- Knowledge Graph features (Phase 4-6 — The Codex)
- Group lesson support (Phase 4)
- Offline recording with sync (Phase 3)
- Rolling pre-buffer "forgot to start" rescue (Phase 2)

## Coding Conventions

- **Python:** Use type hints everywhere. Pydantic for all data validation. Async where IO-bound.
- **Naming:** snake_case for Python, camelCase for TypeScript/React. Descriptive names — `extract_chroma_features` not `get_chroma`.
- **Error handling:** Every pipeline stage should catch exceptions and return a degraded result rather than crashing. If pitch detection fails, the pipeline continues without pitch data. Never let one stage failure kill the entire lesson processing.
- **Confidence scores:** Every analysis stage outputs a confidence value (0.0 to 1.0). Downstream stages and the LLM narrative generator use these to decide what to include in summaries.
- **Logging:** Structured logging (JSON) at every pipeline stage with timing. We need to know exactly where processing time is spent.
- **Tests:** Write tests for the processing pipeline stages using fixture audio files. DTW alignment should be tested with known score/audio pairs where the expected output is manually verified.
- **Immutability:** Lesson records become immutable once the teacher confirms them (`is_locked = True`). After confirmation, amendments can be appended (with timestamps) but the original record is never modified. Parent messages are immutable from the moment they are sent. This pattern is critical for the professional protection use case — the documentation trail must be tamper-evident.
- **Communication logging:** Every parent message must be logged with exact content, delivery channel, timestamp, and delivery status. Never send a message without creating the log entry first. The log is the teacher's proof of communication.

## Common Pitfalls

1. **Browser audio processing will destroy instrument audio.** Always disable echoCancellation, noiseSuppression, and autoGainControl in MediaRecorder constraints.

2. **Demucs expects specific audio format.** Resample to 44100Hz stereo before feeding to Demucs, even though we record mono. Demucs outputs stereo; convert back to mono after separation.

3. **librosa defaults to 22050Hz sample rate.** Be explicit about sr in every librosa call. Use sr=22050 consistently across the pipeline for chroma and pitch analysis.

4. **DTW on full-length chroma is slow.** A 30-minute lesson produces ~35,000 chroma frames. DTW on the full matrix is O(N*M) in memory. Segment first, then align each segment independently against the reference. This is both faster and more accurate (handles the student playing sections out of order).

5. **music21 is slow to parse large scores.** Cache parsed scores and pre-computed reference chromas on disk. Don't re-parse MusicXML on every lesson.

6. **Whisper can hallucinate on music audio.** Even after source separation, the speech track may contain instrument bleed. Whisper sometimes "transcribes" musical sounds as words. Filter transcript segments with low confidence or nonsensical content.

7. **Don't store raw audio longer than needed.** Process-and-delete is the default. Delete audio files after successful pipeline completion. Only structured data (timeline JSON, summaries) persists.

## Reference: Full Blueprint

The complete product blueprint with all business context, edge cases, UX details, and knowledge graph architecture is in `docs/orpheus-blueprint.md`. Read this for the full picture of why decisions were made and where the product is heading long-term.
