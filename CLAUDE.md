# Orpheus — CLAUDE.md

## What This Project Is

**Orpheus** is an intelligent lesson documentation system for music educators. A music teacher taps "record" at the start of a lesson, teaches normally, taps "stop" at the end, and receives an auto-generated structured summary — what pieces were worked on, which sections, at what tempo, how many repetitions, week-over-week progress, plus a parent-friendly message they can copy and share.

The system processes a single audio stream containing both teacher speech and student instrument playing. Currently (Phase 1), it transcribes the speech and generates summaries from the transcript. The full vision separates speech from instrument, analyzes the music, aligns it to a known score, and generates a unified lesson timeline with precise musical data.

This is NOT a generic meeting transcription tool. The core differentiator is that it will understand music — it knows which measures the student played, at what tempo, with what intonation, and how that compares to last week.

**The Codex** is Orpheus's collective knowledge engine — a three-layer knowledge graph built from aggregated lesson data across thousands of teachers. It powers repertoire recommendations, technique dependency mapping, and evidence-based teaching approach suggestions. The Codex is the long-term platform play; Orpheus's lesson documentation is the daily utility that feeds it.

### Naming Hierarchy
```
Orpheus (the app — daily companion for music teachers)
├── Lesson Intelligence — auto-generated summaries, progress tracking
├── Parent Connect — copy-to-clipboard parent communications + parent portal
└── The Codex — collective teaching knowledge (knowledge graph)
    ├── Repertoire Graph — what to teach next
    ├── Technique Map — skill dependencies
    └── Teaching Insights — what approaches work best
```

## Current State (Phase 1 — Live in Production)

### What's Built and Deployed

**The core loop works end-to-end:**
Teacher opens app → selects/creates student → taps Record → teaches normally → taps Stop → audio uploads → AI processes → summary appears in ~2 minutes.

**Recording & Processing:**
- Browser-based audio recording (MediaRecorder API, optimized for music — echoCancellation, noiseSuppression, autoGainControl all disabled)
- Audio saved to Railway local disk at `./storage/audio/{lesson_id}.webm`
- Speech transcription via Groq (Whisper large-v3) with music vocabulary prompt injection
- Timestamped transcript segments passed to LLM (not flat text)
- Previous lesson context passed to LLM for continuity
- LLM narrative generation (Claude Haiku 4.5) with transcription error correction
- Produces teacher summary + parent summary + practice assignments
- Formal summary mode: when `summary_style="formal"`, generates an additional clinical/detailed summary suitable for professional documentation

**Lesson Summary Page:**
- Teacher summary — specific, technical, includes observations
- Parent summary — warm, encouraging, non-technical, written from teacher to parent perspective ("Sofia had a wonderful lesson today...")
- Auto-generated practice assignments
- "Copy Message" button — teacher copies parent message to paste into WhatsApp/Telegram/iMessage
- Assignment spacing with blank lines between items for readability

**Dashboard:**
- Studio overview: student count, weekly lessons, total hours
- Recent lessons list
- Empty state with "Start Lesson" prompt for new teachers

**Student Management:**
- Create and view students
- Student cards with name and lesson history
- Each student scoped to their teacher (data isolation)

**Auth & Multi-Teacher:**
- Email/password signup and login via Supabase Auth
- JWT token validation via JWKS endpoint (ECC/P-256 tokens)
- Complete data isolation — Teacher A never sees Teacher B's data
- Sign out from sidebar

### Recent Improvements (Phase 1.5 — Transcription Accuracy)

Four pipeline improvements shipped, all backend-only:

**A1: Whisper Prompt Injection** — Groq Whisper API call now includes a `prompt` parameter with static music vocabulary (composer names, Italian terms, technique words) plus dynamic injection of the student's known `current_pieces` and name. Stays under Groq's 224-token limit.

**A2: LLM Transcription Cleanup** — Claude's system prompt now includes a `TRANSCRIPT CLEANING` section instructing it to correct common speech-to-text errors before generating summaries (e.g., "the voldi" → "Vivaldi", "speak auto" → "spiccato").

**A3: Timestamped Transcript** — LLM now receives timestamped segments (`[M:SS] text`) instead of flat text. Enables Claude to understand lesson pacing and structure ("spent first 10 minutes on scales, then moved to the Vivaldi").

**A4: Previous Lesson Context** — Pipeline queries the most recent completed lesson for the same student and passes its summary and assignments to the LLM. Enables continuity ("assigned last week" / "previously noted area received attention"). Gracefully skips for first lessons. Wrapped in try/except so failures don't break the pipeline.

### What's NOT Built Yet (Future Phases)

- Silero VAD pre-processing (strip music from audio before Whisper) — next up
- Audio clips (segment lessons, store clips, inline playback)
- Parent portal (link-based lesson history, no account needed)
- Source separation (Demucs) — splitting speech from instrument
- Score alignment (DTW) — measure-level tracking against known scores
- Pitch/intonation analysis (pYIN)
- Tempo tracking per section (madmom)
- Pre-lesson briefs
- Score database (MusicXML/Suzuki repertoire)
- Observations UX pattern (see below)
- Monthly progress reports
- Email/SMS sending (copy-to-clipboard only for now)
- Student record export as PDF
- The Codex (knowledge graph)

## Deployment Architecture

```
┌──────────────────────────────────────────┐
│         Frontend (Next.js)               │
│         Vercel — orpheus-theta.vercel.app │
└──────────────────┬───────────────────────┘
                   │ REST API + Bearer token
┌──────────────────▼───────────────────────┐
│         Backend (FastAPI)                │
│         Railway — orpheus-production.up.  │
│                   railway.app            │
│                                          │
│  Auth: JWKS verification (Supabase ECC)  │
│  CORS: Dynamic origin reflection         │
│  Processing: Background task in-process  │
│  Audio: Local disk ./storage/audio/      │
└──────────────────┬───────────────────────┘
                   │ postgresql+asyncpg://
┌──────────────────▼───────────────────────┐
│         Database & Storage               │
│         Supabase (Asia-Pacific region)   │
│                                          │
│  PostgreSQL via connection pooler        │
│  (pgbouncer, transaction mode)           │
│  statement_cache_size=0 required         │
│                                          │
│  Supabase Auth (ECC P-256 JWT signing)   │
│  Supabase Storage (for audio clips —     │
│    future; not used for raw audio)       │
└──────────────────────────────────────────┘
```

### Key Deployment Details

- **Audio is saved to Railway local disk** at `./storage/audio/{lesson_id}.webm` — NOT Supabase Storage. The path is stored on the lesson row as `audio_file_path`.
- **Database URL must use the Supabase pooler connection** (not direct), and must use `postgresql+asyncpg://` prefix for async SQLAlchemy
- **`statement_cache_size=0`** is required in SQLAlchemy connect_args because pgbouncer in transaction mode doesn't support prepared statements
- **Processing pipeline uses a sync engine** (psycopg2-binary) alongside the async engine — it strips `+asyncpg` from the URL automatically
- **CORS uses dynamic origin reflection** middleware (not a whitelist) because Vercel generates new preview URLs on every deploy
- **Railway watch paths** are set to `server/**`, `processing/**`, `pyproject.toml` so frontend-only pushes don't trigger 10-minute backend rebuilds
- **Supabase Site URL** must point to the Vercel production URL (not localhost) for email confirmation redirects

### Environment Variables

**Railway (Backend):**
```bash
DATABASE_URL=postgresql+asyncpg://postgres.xxx:password@pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
DEV_MODE=false
CORS_ORIGINS=*                    # Dynamic middleware handles this; variable is fallback
```

**Vercel (Frontend):**
```bash
NEXT_PUBLIC_API_URL=https://orpheus-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Local Development (.env):**
```bash
DATABASE_URL=postgresql+asyncpg://orpheus:password@localhost:5432/orpheus
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
DEV_MODE=true                     # Skips JWT auth, uses hardcoded teacher_id
```

## Architecture Overview (Full Vision)

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
                   │ Background task (in-process for now)
┌──────────────────▼──────────────────────────┐
│         PROCESSING PIPELINE                  │
│                                              │
│  Current (Phase 1 + 1.5):                    │
│  1. Speech transcription (Groq/Whisper)      │
│     - Music vocabulary prompt injection      │
│     - Timestamped segments output            │
│  2. Previous lesson context query            │
│  3. LLM narrative generation (Claude Haiku)  │
│     - Transcription error correction         │
│     - Timestamped transcript input           │
│     - Previous lesson continuity             │
│                                              │
│  Next (Phase 1.75 — VAD):                    │
│  0. Silero VAD pre-processing                │
│     (strip music before Whisper)             │
│  1-3. Same as above but with cleaner audio   │
│                                              │
│  Future (Phase 2+):                          │
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
│  Supabase PostgreSQL: students, lessons      │
│  Railway local disk: raw audio (.webm)       │
│  Supabase Storage: audio clips (future)      │
│  (Future) Score database: MusicXML files     │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Frontend | Next.js on Vercel | ✅ Live | Mobile-responsive, cream/warm design system |
| API server | Python 3.13 / FastAPI on Railway | ✅ Live | Async with SQLAlchemy |
| Database | Supabase PostgreSQL (via pooler) | ✅ Live | Asia-Pacific region, pgbouncer transaction mode |
| Auth | Supabase Auth (ECC P-256 JWT) | ✅ Live | JWKS verification on backend |
| Audio storage | Railway local disk | ✅ Live | `./storage/audio/{lesson_id}.webm`, no cleanup yet |
| Speech-to-text | Groq API (whisper-large-v3) | ✅ Live | With music vocabulary prompt injection |
| LLM | Claude Haiku 4.5 (Anthropic API) | ✅ Live | Narrative generation with timestamps + previous lesson |
| Audio recording | MediaRecorder API (browser) | ✅ Live | Music-optimized: echo/noise/gain all disabled |
| VAD | Silero VAD (PyTorch) | 🔜 Next | Strip music before Whisper, no new deps needed |
| Clip storage | Supabase Storage | 🔜 After VAD | Audio clips for playback + parent sharing |
| Source separation | Demucs (Meta) | 🔜 Phase 2 | Requires GPU compute |
| Audio analysis | librosa, madmom | 🔜 Phase 2 | Pitch, chroma, tempo, onset |
| Score alignment | DTW via librosa | 🔜 Phase 2 | Chroma-based alignment |
| Score format | music21 (MusicXML/MIDI) | 🔜 Phase 2 | Reference score parsing |
| Task queue | Celery with Redis | 🔜 When needed | Currently processing runs in-process |

## Design System

- **Background:** Cream/warm off-white
- **Headings:** Cormorant Garamond (serif)
- **Body text:** DM Sans (sans-serif)
- **Primary buttons:** Charcoal/dark
- **Accent:** Warm gold/brown tones
- **Icons:** Lucide React
- **Approach:** Minimal, clean, the app should feel invisible while teaching

## Critical UX Principle: Observations Pattern

**The single most important design decision for the full pipeline.**

When the audio analysis pipeline is complete, the system should NOT present a finished summary as ground truth. Instead, it presents **observations** — individual findings that the teacher reviews and selects before the summary is generated.

### Why This Matters

Music teachers have trained ears. If the system says "measure 48" and it was actually measure 46, the teacher thinks "this tool doesn't know what it's talking about" and never trusts it again. A single wrong detail can kill adoption.

### How It Works

```
Processing complete → System generates observations:

  ✅ Piece identified: Vivaldi Concerto in A minor, Mvt. 1
  ✅ Run-through of opening section (~mm. 1–44), ♩≈78
  ✅ Focused repetition on string crossing passage, 4 attempts
  ✅ Tempo building: ♩=58 → ♩=70 across attempts
  ☐ Intonation drift in higher positions (avg +15 cents)
  ✅ Sight-read new section (~mm. 78–95), ♩≈52
  ✅ A minor scale, 3 octaves
  ☐ 4th finger trending flat on descending passages

  [Generate Summary]
```

Teacher glances through in 10 seconds, unchecks anything wrong, optionally edits, hits Generate. The LLM writes the summary using only approved observations.

### Trust Ladder

1. **Phase 1 (now):** Summary from transcript only. Things that are easy to get right — piece names, general observations, practice suggestions.
2. **Phase 2:** Add musical observations with confidence gating. Only show high-confidence data. Use hedged language ("approximately," "~mm.") for medium confidence. Silently omit low-confidence analysis.
3. **Phase 3:** As teachers confirm observations over time, system accuracy improves. Gradually show more specific data as confidence warrants it.

### Confidence Gating Rules

Every analysis stage outputs a confidence score (0.0 to 1.0):

| Confidence | Behavior |
|---|---|
| High (>85%) | Show as observation with specific data: "mm. 45–62: ♩=78" |
| Medium (60–85%) | Show with hedged language: "~mm. 45–62: ♩≈78" |
| Low (<60%) | Omit from observations entirely |

**Core principle: Never present uncertain analysis as fact. Teacher trust is the product's most valuable asset. Better to say less than say wrong things.**

### Feedback Loop

Every unchecked/edited observation is logged as a signal that the analysis was wrong. This data feeds back into pipeline improvement — you know exactly which stage needs work without teachers filing bug reports.

## Upcoming Features

### Silero VAD Pre-processing (Next Up)

**Problem:** Currently sending full mixed audio (teacher voice + student instrument) to Whisper. Whisper hallucinates on music segments.

**Solution:** Run Silero VAD to strip non-speech segments before sending to Whisper. PyTorch already installed (for Demucs), so no new dependency.

**Flow:**
```
Audio file (.webm) → torchaudio load → Silero VAD → speech timestamps
    → Store VAD map as JSON on lesson record (vad_segments)
    → Extract speech-only segments with timestamp mapping table
    → Concatenate with 300ms silence gaps → temp file → Groq Whisper
    → Remap Whisper timestamps back to real lesson time
    → Continue to narrative stage
```

**Critical:** Timestamp remapping. When music is stripped, Whisper's timestamps are in trimmed-audio time. Must remap to real-lesson time before storing, otherwise clips and future score alignment won't line up.

**The VAD segments JSON becomes the backbone for both transcription and the future clips feature.** Later, the full audio analysis pipeline reads from this same map to know which segments to analyze as music.

### Audio Clips

**Value:** Teacher taps play on a specific section, hears that exact moment. No scrubbing through 30 minutes. Summary becomes a living document, not just text.

**Also for parents:** Teacher selects which clips to share. Parent receives lesson summary + audio links. Parent taps link, hears their kid playing in a simple web player. No app, no account needed.

**Flow:**
```
Full audio (30 min, ~15MB)
    → VAD map gives segment boundaries
    → Slice into clips using torchaudio
    → Upload clips to Supabase Storage: clips/{lesson_id}/segment_001.webm
    → Link clips to timeline entries in database
    → Delete full audio from Railway local disk
    → Total clips: ~3-5MB vs 15MB full recording
```

**Summary page UX:**
```
✅ Run-through of opening section (~mm. 1–44), ♩≈78  🔊
✅ Focused repetition on string crossings, 4 attempts  🔊
✅ Teacher instruction: "relax bow arm at crossing"  🔊
```

Each 🔊 is an inline play button. Teacher also sees a share icon to select clips for parent message.

**Parent message with clip:**
> Sofia had a wonderful lesson today! Here's a clip of her playing the Vivaldi — you can really hear the improvement. 🎵 [Listen →]

The listen link opens a lightweight public page with just an audio player — no login needed.

### Parent Portal

**Concept:** Teacher generates a unique link per student, sends it to the parent once. Parent bookmarks it. Every time they open it, they see the latest lesson reports and shared clips. No app, no account, no login.

**What the parent sees at `/parent/{token}`:**
- Student name + teacher name
- Running list of lessons with parent summaries
- Shared audio clips with inline playback
- Practice assignments for the current week

**How it works:**
- Each student gets a `parent_portal_token` (UUID, unguessable)
- Public Next.js page at `/parent/{token}` — no auth required
- Only shows parent-facing summaries and teacher-shared clips (never teacher notes)
- Teacher controls everything: which summaries are visible, which clips are attached
- Teacher can regenerate token if needed (old link stops working)

**What this replaces:** Currently teacher copies parent message every week and pastes into WhatsApp manually. With the portal, teacher approves summary once and it appears automatically. Teacher sends the link once and never thinks about it again.

### The Codex v1 (Piece Library + Teaching Tips)

**Concept:** Searchable library of pieces with community-contributed teaching tips. No graph algorithms, no effectiveness scoring. Just a place where a teacher can look up a piece and find useful stuff.

**What teacher sees:**
- Search bar + browse by instrument/level
- Piece pages with: score links (IMSLP, MuseScore), common focus areas, teaching tips from other teachers
- Teacher-contributed tips with attribution and upvotes
- "On Orpheus" stats that auto-populate from lesson data (teacher count, average time to learn, common transitions)

**Technical scope:**
- New tables: `Piece` (metadata, links, focus areas) + `TeachingTip` (content, teacher attribution, helpful count) + `PieceResource` (links to scores, arrangements, backing tracks)
- API: search pieces, get piece detail, add tip, upvote tip, add resource
- Frontend: `/codex` (search/browse) + `/codex/{pieceId}` (piece detail)
- Seed data: 50-100 well-known pieces with basic metadata

**Auto-connection to lessons:** Pipeline already extracts piece names from transcripts. Add one step to update Codex stats after each lesson — teacher count, piece assignments, transitions.

## Future Vision

### Student Practice Recording

The same audio pipeline built for lesson documentation can power student practice recording. This was the original product concept, rejected early due to adoption barriers (recording friction + screen time paradox).

**What's different later:** By the time this makes sense, the parent portal exists and parents are already engaged. Practice recording becomes an opt-in extension of an existing workflow, not a standalone app.

**How it would work:** Parent opens portal, sees assignment, taps "Record Practice." Kid plays. Same pipeline runs. Teacher sees before next lesson: "Sofia practiced 4 times this week, focused mostly on string crossings as assigned."

**When to revisit:** After parent portal is live and parents are actively engaging. If parents use the portal, practice recording is natural next step. If they don't, this won't work either.

### Teacher Knowledge Marketplace

Evolution of The Codex from free tips to paid content. Teachers sell annotated scores, custom exercises, lesson plans, video demonstrations. Platform takes 15-20%. Effectiveness ratings from Codex data make paid content evidence-backed. Teacher contributor profiles become professional credentials.

**When to revisit:** After Codex v1 proves teachers contribute and find tips useful.

## Design Decisions and Principles

### Tempo Data Needs Intent-Awareness

**Flagged for when full audio pipeline exists.** Tempo isn't a monotonic progress metric. Playing slower is often correct — slow practice for maintenance, teacher asked student to focus on tone, warming up, expressive rubato. A system that says "♩=70, down from ♩=78 last week" when the teacher deliberately asked the student to slow down is tone-deaf and erodes trust.

**Principle:** Tempo data only means something when paired with intent. Intent lives in what the teacher said, not in the audio analysis alone. Don't editorialize tempo changes without understanding context from speech.

### Measure Numbers and Physical Pointing

When a teacher says "let's work from here to here" while pointing at the score, the transcript-only pipeline can't determine measure numbers. The full audio pipeline solves this — DTW alignment identifies measures from what the student plays, not from what the teacher says. Until then, accept that Phase 1 summaries say "worked on a passage" instead of "worked on mm. 50-80."

## Project Structure

```
orpheus/
├── CLAUDE.md                    # This file
├── pyproject.toml               # Python dependencies
├── requirements.txt             # Auto-generated from pyproject.toml
├── docker-compose.yml           # Local dev: PostgreSQL 16 + Redis 7
├── alembic.ini                  # Database migration config
├── .env.example                 # Environment variables template
├── README.md                    # Quick start guide
│
├── server/                      # FastAPI backend
│   ├── main.py                  # App entry, CORS (dynamic origin reflection), lifespan
│   ├── config.py                # Environment variables, Pydantic settings
│   ├── database.py              # Async SQLAlchemy, statement_cache_size=0
│   ├── auth.py                  # JWKS-based JWT verification (Supabase ECC tokens)
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── student.py           # Student profile (scoped by teacher_id)
│   │   ├── lesson.py            # Lesson record (with immutability)
│   │   ├── piece.py             # Musical piece metadata
│   │   ├── lesson_segment.py    # Individual segment within a lesson
│   │   ├── assignment.py        # Practice assignment with status tracking
│   │   ├── parent_message.py    # Parent communication log
│   │   └── attendance.py        # Attendance/cancellation records
│   │
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── student.py
│   │   ├── lesson.py
│   │   ├── assignment.py
│   │   ├── parent_message.py
│   │   ├── summary.py           # (stub — no classes yet)
│   │   └── export.py            # (stub — no classes yet)
│   │
│   ├── api/                     # API route handlers (all scoped by teacher_id)
│   │   ├── students.py          # CRUD for students (mounted)
│   │   ├── lessons.py           # Start/stop lesson, get summary, upload audio (mounted)
│   │   ├── parents.py           # Parent message endpoints (mounted)
│   │   ├── assignments.py       # Assignment tracking (mounted)
│   │   ├── pieces.py            # (stub — no router, not mounted)
│   │   └── export.py            # (stub — no router, not mounted)
│   │
│   └── services/                # Business logic (all stubs — logic lives in api/ handlers)
│       ├── audio_upload.py      # (stub)
│       ├── lesson_service.py    # (stub)
│       └── export_service.py    # (stub)
│
├── processing/                  # Audio processing pipeline
│   ├── pipeline.py              # Main orchestrator (uses sync DB engine)
│   │                            # Builds Whisper prompt, formats timestamps,
│   │                            # queries previous lesson, calls stages
│   ├── worker.py                # Background task worker (stub)
│   │
│   ├── stages/                  # Each processing stage as a module
│   │   ├── transcription.py     # ✅ Groq/Whisper: speech → timestamped text
│   │   │                        # Accepts prompt parameter for vocabulary hints
│   │   ├── narrative.py         # ✅ Claude Haiku 4.5 → teacher + parent summaries
│   │   │                        # Includes: transcript cleanup, timestamp awareness,
│   │   │                        # previous lesson continuity, formal mode option
│   │   │
│   │   │  # Future stages — all stubs (Phase 1.75+):
│   │   │  # vad.py does NOT exist yet — will be created for Phase 1.75
│   │   ├── source_separation.py # (stub) Demucs: split speech from instrument
│   │   ├── entity_extraction.py # (stub) Extract piece names from transcript
│   │   ├── pitch_detection.py   # (stub) pYIN: audio → pitch curve
│   │   ├── chroma_extraction.py # (stub) STFT → 12-dim chroma features
│   │   ├── onset_detection.py   # (stub) Spectral flux → note onset timestamps
│   │   ├── beat_tracking.py     # (stub) madmom: → beat positions + BPM
│   │   ├── segmentation.py      # (stub) Silence detection → lesson segments
│   │   ├── score_alignment.py   # (stub) DTW: student chroma ↔ reference chroma
│   │   ├── intonation.py        # (stub) Pitch deviation analysis
│   │   ├── behavior.py          # (stub) Classify: run-through, spot practice, etc.
│   │   └── timeline_merge.py    # (stub) Combine speech + music into timeline
│   │
│   └── utils/                   # (all stubs)
│       ├── audio_io.py          # Load/save/convert audio files
│       ├── confidence.py        # Confidence scoring utilities
│       └── music_theory.py      # Cents calculation, note naming, etc.
│
├── scores/                      # Score database system (Phase 2 prep)
│   ├── database.py              # Score lookup and matching
│   ├── loader.py                # Parse MusicXML/MIDI files
│   ├── chroma_cache.py          # Pre-computed chroma features for references
│   └── data/                    # Score data files (empty — .gitkeep only)
│       ├── suzuki_book1/
│       ├── suzuki_book2/
│       ├── suzuki_book3/
│       └── suzuki_book4/
│
├── frontend/                    # Next.js web app
│   ├── package.json
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client (browser)
│   │   └── api.ts               # API client (auto-attaches Bearer token)
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Redirects to dashboard
│   │   ├── login/
│   │   │   ├── layout.tsx       # Login-specific layout
│   │   │   └── page.tsx         # Email/password login + signup
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Teacher dashboard (studio overview)
│   │   ├── lesson/
│   │   │   ├── record/
│   │   │   │   ├── page.tsx         # Record screen (student select + record button)
│   │   │   │   └── [studentId]/page.tsx  # Record with pre-selected student
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Lesson summary view
│   │   │       └── processing/page.tsx  # Processing state view
│   │   └── students/
│   │       ├── page.tsx             # Student list
│   │       └── [id]/
│   │           ├── page.tsx         # Student profile + history
│   │           ├── record/page.tsx  # Record from student detail
│   │           └── export/page.tsx  # Student record export
│   │   # Note: parent/[token]/page.tsx does not exist yet (future)
│   └── components/
│       ├── AudioRecorder.tsx         # MediaRecorder wrapper (music-optimized)
│       ├── LessonSummary.tsx         # Summary display
│       ├── LessonCard.tsx            # Lesson list item
│       ├── SendToParentModal.tsx     # Parent message with Copy button
│       ├── ParentMessage.tsx         # Parent message display
│       ├── StudentCard.tsx           # Student list item
│       ├── AssignmentTracker.tsx     # Assignment list with status
│       ├── AssignmentCard.tsx        # Individual assignment card
│       ├── EditableAssignmentCard.tsx # Editable assignment card
│       ├── EditableChip.tsx          # Editable tag/chip component
│       ├── CommunicationLog.tsx      # Communication history
│       ├── ConfirmButton.tsx         # Button with confirmation dialog
│       ├── TempoChart.tsx            # Tempo visualization
│       ├── auth/
│       │   └── AuthGuard.tsx         # Redirects to /login if no session
│       ├── layout/
│       │   ├── AppShell.tsx          # Main app shell
│       │   ├── AppShellWrapper.tsx   # Sidebar/nav layout (hidden on login)
│       │   ├── Sidebar.tsx           # Navigation sidebar
│       │   └── MobileNav.tsx         # Mobile navigation
│       └── ui/
│           ├── FadeIn.tsx            # Fade-in animation wrapper
│           └── QuickStatCard.tsx     # Dashboard stat card
│
├── alembic/                     # Database migrations
│   ├── env.py                   # Migration environment (async SQLAlchemy)
│   ├── script.py.mako           # Migration template
│   └── versions/
│       └── 0001_initial_tables.py  # Initial schema creation
│
├── scripts/                     # Development utility scripts
│   ├── generate_chroma_cache.py # Pre-compute reference chroma features
│   ├── seed_scores.py           # Populate score database with initial repertoire
│   ├── simulate_lesson.py       # Generate synthetic test lesson data
│   └── test_api_flow.py         # End-to-end API testing script
│
├── docs/
│   └── orpheus-blueprint.md     # Full product blueprint
│
└── tests/
    ├── test_pipeline.py         # Pipeline tests (stub)
    ├── test_alignment.py        # Score alignment tests (stub)
    ├── test_pitch.py            # Pitch detection tests (stub)
    └── fixtures/                # Test audio files
```

## Key Domain Concepts

### Lesson
A single recording session between a teacher and one student. Has a start time, end time, associated student, and produces observations and summaries after processing.

### Observation (Future — Phase 2+)
A single finding from the audio analysis pipeline — e.g., "Run-through of opening section, ♩≈78" or "Intonation drift in higher positions." Each observation has a confidence score. Teachers review and approve observations before summary generation.

### Segment
A continuous section of audio within a lesson, bounded by silence gaps. Each segment is classified as SPEECH, MUSIC, or SILENCE. Music segments are further aligned to score positions.

### VAD Segments (Upcoming)
JSON array stored on the lesson record from Silero VAD analysis. Each entry has start, end, and type (speech/music/silence). Used by the transcription pipeline (which segments to send to Whisper) and the clips pipeline (where to slice audio). Later, the full audio analysis pipeline reads from this same map.

### Score Alignment
The process of mapping a student's audio to specific positions (measure numbers) in a known musical score, using Dynamic Time Warping (DTW) on chroma features.

### Chroma Features
A 12-dimensional representation of audio where each dimension corresponds to a pitch class (C, C#, D, ..., B), regardless of octave. This is the shared representation used to compare student audio against reference scores. Works for both monophonic (violin) and polyphonic (piano) instruments.

### Lesson Timeline
The final merged data structure combining speech transcript entries and music analysis entries in chronological order. This is the JSON that gets sent to the LLM for narrative generation.

### Summary
The human-readable output. Two versions: teacher-facing (specific, technical) and parent-facing (warm, encouraging, non-technical, written from teacher to parent about their child).

### Parent Portal Token
A UUID assigned to each student, used as the URL path for the public parent portal. Unguessable, no login required. Teacher sends link once, parent bookmarks it.

## Parent Message Guidelines

**Perspective:** Always written as the teacher speaking to the parent about their child. Third person for the student ("Sofia had a wonderful lesson" not "Great job, Sofia!"). Never address the student directly.

**Tone:** Warm, encouraging, professional — like a teacher's note sent home.

**Structure:**
1. Open with something genuinely positive about today's lesson
2. Briefly describe what was worked on (non-technical language)
3. One or two specific things the parent can encourage at home
4. Recommended daily practice duration

**Never use:** struggled, failed, couldn't, wrong, mistake, problem, weak, poor, bad, behind, slow (in context of learning pace)

**Delivery:** Currently copy-to-clipboard only. Teacher pastes into WhatsApp, Telegram, iMessage, or any messaging app. Parent portal planned as primary delivery method.

## Data Models

### Student
```python
class Student:
    id: UUID
    teacher_id: UUID              # Scoped — every query filters by this
    name: str
    instrument: str
    created_at: datetime
    current_pieces: list[str]     # Detected from lesson content
    estimated_level: str | None
    notes: str | None
    parent_email: str | None
    parent_phone: str | None
    # Future: parent_portal_token (UUID) — not yet added to model
```

### Lesson
```python
class Lesson:
    id: UUID
    student_id: UUID
    teacher_id: UUID              # Scoped — every query filters by this
    started_at: datetime
    ended_at: datetime
    duration_seconds: int
    audio_file_path: str | None   # Railway local disk, not Supabase Storage
    status: str                   # "recording", "processing", "completed", "failed"
    summary_style: str            # "standard" or "formal" — controls narrative tone
    # Populated after processing:
    pieces_detected: list[str]
    timeline_json: dict
    teacher_summary: str
    teacher_summary_formal: str | None  # Formal-mode output (when summary_style="formal")
    parent_summary: str
    suggested_assignments: list[dict]
    processing_metadata: dict     # Confidence scores, processing time
    # Immutability:
    confirmed_at: datetime | None
    is_locked: bool               # True after confirmation
    amendments: list[dict] | None # Timestamped teacher notes after confirmation
    # Future (not yet on model): vad_segments: list[dict]
```

## Processing Pipeline — Current Implementation

### Phase 1 + 1.5 (Live Now)
```
Audio saved to Railway local disk (.webm)
    → Build Whisper prompt (static music vocab + student's known pieces + name)
    → Groq Whisper transcription (whisper-large-v3, verbose_json)
    → Format timestamped segments as [M:SS] text
    → Query previous lesson summary for this student
    → Claude Haiku 4.5 generates summaries
       (with transcript cleanup + timestamps + previous lesson context)
    → Persist to lesson record, set status = "completed"
```

### Phase 1.75 (Next — VAD)
```
Audio saved to Railway local disk (.webm)
    → Silero VAD: classify frames as speech/music/silence
    → Store VAD map on lesson record
    → Extract speech-only audio with timestamp mapping
    → Build Whisper prompt
    → Groq Whisper on speech-only audio
    → Remap timestamps to real lesson time
    → Format + query previous lesson + Claude generates summaries
```

### Phase 2 (Future — Full Audio Intelligence)
Add source separation + music analysis + score alignment. See the full blueprint (`docs/orpheus-blueprint.md`) for detailed implementation notes on each stage.

Key implementation notes:

- **Demucs expects 44100Hz stereo.** Resample before feeding, convert back to mono after.
- **librosa defaults to 22050Hz.** Be explicit about `sr` in every call.
- **DTW on full-length chroma is slow.** Segment first, align each segment independently.
- **music21 is slow.** Cache parsed scores and pre-computed reference chromas.
- **Whisper hallucinates on music audio.** VAD pre-processing (Phase 1.75) addresses this. Also filter low-confidence transcript segments.
- **Processing pipeline uses sync SQLAlchemy** (psycopg2-binary) separately from the async API engine (asyncpg). The pipeline converts the DATABASE_URL by stripping `+asyncpg`.

## Audio Recording in Browser

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: false,    // CRITICAL: don't cancel instrument audio
        noiseSuppression: false,    // CRITICAL: instrument IS the signal
        autoGainControl: false      // CRITICAL: dynamic range matters
    }
});
```

**Critical:** Disable echoCancellation, noiseSuppression, and autoGainControl. Browser defaults are designed for voice calls and will aggressively filter out musical instrument sounds.

**Output format:** `audio/webm;codecs=opus` at 64kbps mono 44100Hz. ~0.5MB per minute, ~15MB for 30-minute lesson. Within Groq's 25MB direct upload limit.

## Coding Conventions

- **Python:** Type hints everywhere. Pydantic for validation. Async where IO-bound.
- **TypeScript:** camelCase. Functional components with hooks.
- **Naming:** Descriptive — `extract_chroma_features` not `get_chroma`.
- **Error handling:** Every pipeline stage catches exceptions and returns degraded results. Never let one stage failure kill entire processing.
- **Confidence scores:** Every analysis stage outputs 0.0–1.0. Used for observation gating.
- **Logging:** Structured (JSON) at every pipeline stage with timing.
- **Data isolation:** Every database query MUST be scoped by `teacher_id`. No exceptions.
- **Immutability:** Confirmed lessons are locked. Amendments are appended, originals never modified.
- **Trust over precision:** Better to show less data that's accurate than more data that might be wrong.

## Common Pitfalls

1. **Browser audio processing destroys instrument audio.** Always disable echoCancellation, noiseSuppression, autoGainControl.
2. **Supabase pooler doesn't support prepared statements.** Always set `statement_cache_size=0` in asyncpg connect_args.
3. **Supabase uses ECC JWT signing (P-256), not HS256.** Backend must verify via JWKS endpoint, not shared secret.
4. **Vercel generates new preview URLs on every deploy.** CORS must use dynamic origin reflection, not a whitelist.
5. **Railway rebuilds on every push by default.** Set watch paths to `server/**`, `processing/**`, `pyproject.toml`.
6. **Processing pipeline needs sync DB driver.** asyncpg is for the API; psycopg2-binary is for the pipeline.
7. **Parent messages must be teacher-to-parent perspective.** Never address the student directly.
8. **DTW on full-length chroma is O(N*M).** Segment first, then align independently.
9. **Whisper hallucinates on music audio.** VAD pre-processing strips music before Whisper. Also filter low-confidence segments.
10. **Audio is stored on Railway local disk, not Supabase Storage.** Path: `./storage/audio/{lesson_id}.webm`. No cleanup implemented yet.
11. **Groq Whisper prompt parameter limited to 224 tokens.** Build prompt dynamically, truncate at 800 chars.
12. **VAD timestamp remapping is critical.** When music is stripped, Whisper timestamps are in trimmed-audio time. Must remap to real-lesson time before storing.

## Score Database — Practical Notes

The starting repertoire plan focuses on public domain works available as MusicXML:
- Standard classical violin concertos, etudes, sonatas from MuseScore/IMSLP
- ~100-150 pieces realistically available on day one
- Suzuki-specific arrangements are copyrighted (Alfred Music) — cannot be distributed, but the underlying pieces (Bach, Vivaldi, Handel) are public domain
- Teachers can contribute via photo scan (OMR) or reference recording
- The database grows through teacher contributions (flywheel effect)

**Graceful degradation when no score exists:**
1. Community match (another teacher uploaded it)
2. Photo scan via OMR (~90-95% accuracy)
3. Teacher records a reference performance
4. Manual section labels
5. No reference — still tracks time, speech, tempo, repetitions

## Phased Roadmap

### Phase 1 — Lesson Documentation (✅ Live)
Record → transcribe → AI summary → copy to parent. Basic but functional.

### Phase 1.5 — Transcription Accuracy (✅ Shipped)
Whisper prompt injection, LLM transcription cleanup, timestamped segments, previous lesson context. Better summaries, no infrastructure changes.

### Phase 1.75 — VAD + Audio Clips (🔜 Next)
Silero VAD pre-processing for dramatically cleaner transcription. Audio clip segmentation and storage. Inline playback on summary page. Clip sharing with parents.

### Phase 2 — Parent Portal
Link-based parent view of lesson history and shared clips. No account needed. Teacher sends link once, parent bookmarks it.

### Phase 3 — Music Intelligence
Source separation, score alignment, tempo/pitch tracking. The Observations UX pattern. This is what differentiates Orpheus from generic meeting AI.

### Phase 4 — Longitudinal Tracking
Pre-lesson briefs, week-over-week comparisons, monthly progress reports, student record export as PDF.

### Phase 5 — The Codex (Layer 1: Piece Library + Teaching Tips)
Searchable piece library, teacher-contributed tips and resources, community upvoting. Auto-populated stats from lesson data.

### Phase 6 — The Codex (Layer 2: Repertoire Graph + Technique Map)
Track piece transitions across teachers. Technique dependency graph. "Other teachers assign these pieces next."

### Phase 7 — The Codex (Layer 3: Teaching Insights + Marketplace)
Instruction clustering from speech transcripts. Passage-specific teaching approach recommendations. Paid content marketplace for teacher-created resources.

### Future — Student Practice Recording
Same pipeline, different entry point. Parent opens portal, taps "Record Practice." Only viable after parent portal proves engagement.

## Competitive Landscape

**Closest competitor:** ForteAI (forteai.org) — claims lesson capture, student histories, scoring of timing/intonation/dynamics. Appears very early stage, unclear actual depth.

**Adjacent products (solve fragments only):**
- Studio management (My Music Staff, Fons) — scheduling/billing, manual notes
- Online lessons (Forte Lessons) — video conferencing for music, no AI
- Practice apps (Tonara, SmartMusic) — student-facing, not lesson documentation
- Repertoire tools (Trinity NoteLab) — piece discovery, no recording
- Generic AI (Otter.ai) — speech only, instruments are noise

**Nobody does the full stack.** The Codex has no equivalent anywhere. That's the long-term moat.

## Priority Queue

| Priority | Feature | Effort (with Claude Code) | Status |
|----------|---------|---------------------------|--------|
| 1 | Transcription accuracy — Layer A (prompt improvements) | ~1 hour | ✅ Shipped |
| 2 | Transcription accuracy — Layer B (Silero VAD) | 1-2 hours + testing | 🔜 Next |
| 3 | Transcription accuracy — Layer C (validation) | 1 hour (manual listening) | After Layer B |
| 4 | Audio clips (segment, store, playback) | Half day | After Upgrade 1 |
| 5 | Parent portal (link-based, no account) | 1-2 hours | After clips |
| 6 | The Codex v1 (piece library + teaching tips) | 1 day | After parent portal |
| — | Full audio analysis pipeline (Demucs, DTW, pYIN) | Days | Phase 3 |
| — | Observations UX pattern | Half day | After audio pipeline |
| — | Codex data collection (auto from lessons) | 1-2 hours | After Codex v1 |
| — | Teacher knowledge marketplace | Days | Much later |
| — | Student practice recording | Hours (same pipeline) | After parent portal proves engagement |

*Note: Effort estimates assume Claude Code handles implementation. Real bottleneck is prompt writing, testing with real recordings, and debugging deployment — not coding.*

## Reference: Full Blueprint

The complete product blueprint with all business context, edge cases, UX details, and knowledge graph architecture is in `docs/orpheus-blueprint.md`. Read this for the full picture of why decisions were made and where the product is heading long-term.
