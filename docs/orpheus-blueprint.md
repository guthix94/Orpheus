# Orpheus — Product Blueprint

## The Intelligent Lesson Documentation System for Music Educators

*Version 1.3 — February 2026*

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Product Vision](#2-product-vision)
3. [Why Lesson-Centered, Not Practice-Centered](#3-why-lesson-centered-not-practice-centered)
4. [Core Value Propositions](#4-core-value-propositions)
5. [User Experience Walkthrough](#5-user-experience-walkthrough)
6. [Technical Architecture](#6-technical-architecture)
7. [The Audio Processing Pipeline — Step by Step](#7-the-audio-processing-pipeline--step-by-step)
8. [Score Alignment — How It Works](#8-score-alignment--how-it-works)
9. [When the Score Doesn't Exist](#9-when-the-score-doesnt-exist)
10. [What Makes This Different From Generic Meeting AI](#10-what-makes-this-different-from-generic-meeting-ai)
11. [Progressive Onboarding](#11-progressive-onboarding)
12. [Edge Cases and Solutions](#12-edge-cases-and-solutions)
13. [Professional Protection — Documentation as Evidence](#13-professional-protection--documentation-as-evidence)
14. [The Codex — Orpheus's Music Education Knowledge Graph](#14-the-codex--orpheuss-music-education-knowledge-graph)
15. [Technology Stack and Costs](#15-technology-stack-and-costs)
16. [Business Model](#16-business-model)
17. [MVP Scope and Build Plan](#17-mvp-scope-and-build-plan)

---

## 1. The Problem

### The Universal Pain of Music Teachers

Music teachers — whether private instructors, school ensemble directors, or conservatory faculty — share a set of deeply entrenched problems that no existing tool adequately solves.

**The Documentation Gap.** A typical private music teacher has 20-30 students seen in back-to-back 30-minute lessons. By the end of a teaching day, they can barely remember what happened in the first lesson. Notes are scribbled on sticky notes, if written at all. Most teachers walk into each lesson asking "so what were we working on?" — wasting time and losing continuity.

**The Parent Communication Burden.** Parents invest heavily in their child's music education but have almost zero visibility into what's happening. They email teachers asking "how is my child progressing?" and the teacher must reconstruct from memory. Parents want to support home practice but don't know what their child should be working on, how long they should practice, or what "good" sounds like.

**The Invisible Practice Room.** The most important learning happens between lessons, when the student practices alone. Teachers assign practice goals but have no idea whether or how students follow through. Lessons begin with detective work instead of coaching.

**The Lost Institutional Knowledge.** Every music teacher carries decades of pedagogical wisdom about which pieces to assign, in what order, and why. This knowledge lives entirely in their heads and is lost when they retire. There is no shared infrastructure for pedagogical sequencing across the global community of music educators.

### Why Existing Tools Fall Short

Current tools address fragments of this problem but none solve it holistically:

- **Studio management software** (My Music Staff, Fons, ToneSavvy) handles scheduling and billing but offers nothing for lesson content or musical progress tracking.
- **Practice apps** (Yousician, Tonestro, SmartMusic) are student-facing gamification tools that optimize for engagement, not for teacher insight. They require the student to use a device during practice, creating adoption friction.
- **Generic meeting AI** (Otter.ai, Fireflies, Granola) can transcribe speech but treats the musical content of a lesson — the most important part — as background noise.
- **Notebooks and spreadsheets** are manual, unsearchable, and create no longitudinal insight.

---

## 2. Product Vision

Orpheus is an intelligent lesson documentation system that listens during music lessons and automatically generates structured summaries, practice assignments, parent communications, and longitudinal progress tracking — all without the teacher changing how they teach.

**The one-sentence pitch:** Teach your lesson. We'll handle the notes.

**The core insight:** The highest-leverage intervention in music education isn't putting technology in the practice room (where it creates friction with students and parents). It's putting technology in the lesson — the one hour per week where the teacher is present, the device is already out, and the audio environment is controlled.

**What makes it different from a meeting AI:** Orpheus doesn't just understand speech. It understands music. It knows which piece the student is playing, which section they're working on, what tempo they're achieving, how their intonation compares to last week, and what patterns in their playing suggest about their technical development. This dual-stream intelligence — speech plus music analysis — is what no generic tool can replicate.

---

## 3. Why Lesson-Centered, Not Practice-Centered

The original concept was a practice-recording tool: students record their home practice, and the system generates reports for the teacher. After deep analysis, we identified two critical adoption barriers that redirected the product:

### Barrier 1: The Recording Friction Problem

Requiring students to actively press "record" before practicing introduces friction at the worst possible moment. A 10-year-old who's already reluctant to practice won't think to open an app first. Every extra step between "pick up instrument" and "start playing" is a leak in the adoption funnel.

Potential solutions (passive listening device, smart speaker integration, background auto-detection) all introduce their own problems: hardware costs, battery drain, reliability issues, and a surveillance feeling that undermines the personal nature of practice.

### Barrier 2: The Screen Time Paradox

The parents most invested in music education — the ones paying for private lessons and quality instruments — are often the same parents most concerned about screen time. Asking them to hand their child a phone or tablet during practice time, which may be one of the few device-free activities in the child's day, creates a fundamental tension in the product's positioning.

### The Lesson-Centered Solution

By shifting the product to the lesson itself, both barriers dissolve:

- **Zero friction for students.** They never interact with the app. They just walk in and play.
- **Zero screen time concerns.** The device is in the teacher's hands, not the child's.
- **100% adoption control.** The teacher manages the workflow entirely.
- **Cleaner audio.** Lesson rooms are typically better acoustically than bedrooms.
- **Verified data.** The teacher is present to confirm what the system detects.
- **Immediate value.** The first lesson generates a useful summary. No setup required.

The tradeoff is losing day-by-day practice visibility. But the lesson-centered model still captures the most important data — what the student can do each week — and infers practice patterns from the delta between lessons. Over time, if the product proves valuable enough, students may opt into practice recording voluntarily. But the core product doesn't depend on it.

---

## 4. Core Value Propositions

### For Teachers

**Automatic lesson documentation.** Every lesson produces a structured record — what was covered, what sections were worked on, at what tempo, with what quality — without the teacher writing a single note.

**Pre-lesson briefs.** Before each lesson, the teacher sees a quick summary of last week: what was assigned, what the key issues were, what to check this week. No more "so what were we working on?"

**Practice assignments that write themselves.** Based on what happened in the lesson, the system generates suggested practice goals. The teacher reviews, tweaks, and confirms in 15 seconds.

**Progress tracking over time.** Tempo improvements, intonation trends, repertoire completion timelines — all tracked automatically across weeks and months.

**Lesson planning support.** Weekly view of all students with suggested focus areas, reducing Saturday planning from an hour to 15 minutes.

**Professional protection.** Every lesson produces a timestamped, verifiable record of what was covered, what was assigned, and what progress was made. Every parent communication is logged with delivery confirmation. If a dispute ever arises — about progress, about what was taught, about what was communicated — the teacher has a complete, data-backed paper trail. This transforms "I said, you said" into "here's the record."

### For Parents

**Weekly lesson updates.** A clear, warm, non-technical message after each lesson explaining what was covered and what to encourage at home. No app download required — delivered via email or SMS.

**Monthly progress reports.** Data-backed summaries of their child's development, specific enough to be meaningful, encouraging enough to be motivating.

**Actionable practice guidance.** Instead of the useless "did you practice?", parents can say "have you done your run-through today?" because they know what was assigned.

### For Students (Indirect)

**More effective lessons.** Teachers arrive prepared, spend less time on review, and give more targeted feedback.

**Continuity.** No more losing progress when a teacher forgets what was covered last week.

**Recognition.** Progress data shows improvement over time, which is deeply motivating — especially for students who feel stuck in the day-to-day grind of practice.

---

## 5. User Experience Walkthrough

### Phase 1: Discovery and Signup (Day 1)

**Account creation — 4 screens, under 60 seconds:**

1. What's your name?
2. What do you teach? (instrument selection — configures the audio pipeline)
3. Roughly how many students? (1-10 / 11-25 / 25-50 / 50+)
4. You're ready. Start your next lesson by tapping the button below.

No student names, no schedules, no repertoire, no payment info. The teacher hasn't committed to anything beyond trying it.

### Phase 2: The First Lesson

**Starting:** Teacher opens app, types student's first name ("Sofia"), taps "Start Lesson." Puts phone on music stand. Begins teaching normally.

**During the lesson:** Minimal display — student name, elapsed time, subtle recording indicator, stop button. The app is deliberately invisible. The teacher should forget it exists.

**Ending:** Teacher taps "End Lesson." Screen shows "Processing your lesson... ~2 min. We'll notify you when your summary is ready." Teacher can immediately start their next lesson.

**The summary arrives (2-3 minutes later):**

The teacher sees a structured summary:
- Piece identified (from speech transcription: teacher said "let's work on the Vivaldi")
- Sections worked on with measure numbers (from audio-to-score alignment)
- Tempo per section (from beat tracking)
- Number of repetitions per section (from segment analysis)
- Key observations (from intonation analysis and speech context)
- Suggested practice assignments (from LLM synthesis)

The teacher scans it in 10-15 seconds, optionally tweaks one assignment, taps confirm. Done.

**Optional: parent communication.** Teacher taps "Send to parent," enters email (remembered for next time), previews the parent-friendly version of the summary, sends. The parent receives a warm, specific, non-technical update about their child's lesson — no app download required.

### Phase 3: First Week (Building the Habit)

By the second lesson with any student, the system shows a **pre-lesson brief** — last week's summary, what was assigned, key issues to follow up on. The teacher glances at it for 5 seconds before starting. They no longer ask "so what were we working on?"

Summaries now include **week-over-week comparisons**: "String crossings at ♩=78 today, up from ♩=70 last week (+11%)."

### Phase 4: First Month (The Product Gets Smarter)

Student profiles build themselves from observed lessons — no forms, no data entry:
- Current repertoire detected from lesson content
- Approximate level estimated from repertoire difficulty
- Progress trends computed from tempo/intonation data across lessons
- Learning patterns identified (e.g., "consistently rushes sixteenth-note passages," "tends to avoid development sections")

Monthly progress reports generate automatically. Teacher reviews and sends to parents in 20 minutes for all students — a task that previously took an entire Sunday, if it happened at all.

### Phase 5: Three Months In (Network Effects)

When a student completes a piece and needs new repertoire, the system surfaces what other teachers assign next — informed by **The Codex**, Orpheus's collective knowledge engine built organically from thousands of teachers' sequencing decisions. Recommendations are personalized based on the student's profile (strengths, weaknesses, interests).

### Phase 6: Six Months In (Indispensable)

The product has become infrastructure:
- Pre-lesson briefs: 10 seconds of review replaces "so what were we working on?"
- Post-lesson summaries: 15 seconds of review replaces 5 minutes of note-taking
- Parent communications: one tap replaces 10 minutes of email composition
- Monthly reports: 20 minutes replaces hours of manual compilation
- Progress data: immediate, data-backed answers to parent inquiries
- Repertoire selection: informed by collective wisdom, not just personal experience

Total additional time per week: ~10 minutes. Time saved per week: 2-3 hours. Six months of accumulated data makes switching prohibitively costly — the longitudinal insight is irreplaceable.

---

## 6. Technical Architecture

### System Overview

```
CLIENT (phone/tablet):
├── Audio recording (AAC/Opus, 64kbps mono)
├── Rolling 5-minute pre-buffer (for "forgot to start" rescue)
├── Real-time Voice Activity Detection (Silero VAD, on-device)
├── Energy monitoring and audio quality assessment
└── Offline queue for sync when connectivity is unavailable

SERVER:
├── Source Separation (Demucs — GPU)
├── Speech-to-Text (Whisper — CPU/GPU)
├── NLP Entity Extraction (piece names, musical terms)
├── Pitch Detection (pYIN via librosa — CPU)
├── Chroma Feature Extraction (librosa — CPU)
├── Onset Detection (madmom — CPU)
├── Beat/Tempo Tracking (madmom RNNBeatProcessor — CPU)
├── Score Alignment (Dynamic Time Warping — CPU)
├── Intonation Pattern Analysis (rule-based — CPU)
├── Lesson Segmentation (rule-based — CPU)
├── Practice Behavior Classification (rule-based — CPU)
├── Timeline Merging (speech + music — custom logic)
├── LLM Narrative Generation (API call — Claude or GPT)
└── The Codex Engine (PostgreSQL + graph queries)

DATA STORES:
├── Student Profiles (PostgreSQL)
├── Lesson Structured Data (PostgreSQL / JSON)
├── Score Database (MusicXML / MIDI files)
├── The Codex (PostgreSQL or Neo4j)
└── Audio Files (S3, process-and-delete by default)

EXTERNAL SERVICES:
├── Email Delivery (SendGrid)
├── SMS Delivery (Twilio)
└── LLM API (Anthropic Claude / OpenAI GPT for narratives)
```

### Data Flow

```
Teacher taps "Start Lesson"
    ↓
Phone microphone records audio (mono, 44.1kHz, AAC 64kbps)
VAD runs in real-time, tagging frames as speech/music/silence
    ↓
Teacher taps "End Lesson"
    ↓
Audio file uploaded to server (or queued for offline sync)
~15MB for a 30-minute lesson
    ↓
Source Separation (Demucs) splits into speech + instrument streams
    ↓
PARALLEL PROCESSING:
├── Speech stream → Whisper → timestamped transcript
│   → NLP extracts piece names, musical terms, instructions
│
└── Instrument stream → librosa/madmom pipeline
    ├── Pitch detection (pYIN) → continuous pitch curve
    ├── Chroma extraction → 12-dimensional pitch class features
    ├── Onset detection → note attack timestamps
    └── Beat/tempo tracking → BPM per segment
    ↓
Score Alignment (DTW) maps audio segments to measure numbers
    ↓
Intonation Analysis compares detected pitch to expected pitch
Pattern Analysis identifies recurring tendencies
    ↓
Lesson Segmentation + Behavior Classification
structures the lesson into a timeline of events
    ↓
Speech + Music merged into unified lesson timeline (JSON)
    ↓
LLM generates teacher summary + parent summary + practice assignments
    ↓
Notification sent to teacher's device
Summary appears in teacher dashboard
```

---

## 7. The Audio Processing Pipeline — Step by Step

### Step 1: Audio Capture

The student's phone microphone records at 44.1kHz, mono channel, compressed to AAC or Opus at 64kbps. This produces approximately 0.5MB per minute — a 30-minute lesson is ~15MB.

**The rolling pre-buffer:** The app continuously maintains a 5-minute audio buffer in memory, like a dashcam. If the teacher forgets to tap "Start" and realizes 5 minutes into the lesson, the app asks "Want to include the last 5 minutes?" and recovers the missed audio. This builds trust through graceful error recovery.

**Audio quality assessment:** On the first recording, the app evaluates microphone quality and background noise levels. This determines how ambitious the analysis can be:
- Good mic, low noise → full analysis (pitch, tempo, alignment, intonation)
- Mediocre mic → reduced analysis (tempo, rough alignment, time tracking)
- Poor mic → basic analysis (time tracking, speech transcription only)

### Step 2: Voice Activity Detection (Real-Time, On-Device)

**Silero VAD** (open source, under 1MB model size) runs in real-time, classifying each audio frame as speech, music, or silence. This creates a segmentation map stored alongside the audio:

```
0:00 - 0:22  → SPEECH
0:22 - 2:30  → MUSIC
2:30 - 2:40  → SPEECH
2:40 - 3:05  → MUSIC
3:05 - 3:15  → SPEECH
...
```

This is lightweight — negligible CPU and battery impact. It's used later to split the audio for parallel processing and to structure the lesson timeline.

### Step 3: Source Separation (Server-Side, Demucs)

**Demucs** is a neural network model developed by Meta/Facebook Research (MIT license, free) that separates mixed audio into component sources. Originally designed to separate vocals from music in songs, it works well for separating a speaking voice from an instrument.

Input: single audio file containing mixed teacher speech + student instrument + room noise.
Output: two separated audio streams — speech and instrument.

Processing time: 2-3 minutes for a 30-minute file on a GPU server.

The separation isn't perfect — there will be artifacts and bleed-through. But it doesn't need to be perfect. The speech stream needs to be clean enough for transcription (Whisper is robust to some background noise). The instrument stream needs to be clean enough for chroma-based analysis (which aggregates across frequency bands and is tolerant of minor artifacts).

### Step 4: Speech Transcription (Whisper)

The separated speech stream is processed by **OpenAI's Whisper** model (open source, can be self-hosted at zero per-use cost).

Output: timestamped transcript with speaker turns.

```json
[
  {"start": 0.0, "end": 3.2, "text": "Hi Sofia, how was your week?"},
  {"start": 3.5, "end": 5.1, "text": "Yeah, mostly. The fast part is still hard."},
  {"start": 5.4, "end": 8.1, "text": "Let's hear it. Start from the beginning of the Vivaldi."}
]
```

Whisper automatically detects the language being spoken (supports 99 languages). A teacher in Mexico City teaching in Spanish, a teacher in Tokyo teaching in Japanese — no configuration needed.

**NLP entity extraction** scans the transcript for piece names and musical terms. When Whisper transcribes "Start from the beginning of the Vivaldi," a lightweight extraction layer identifies "Vivaldi" as a piece reference and cross-references it against the score database. For a violin student, this most likely resolves to Vivaldi Violin Concerto in A minor, RV 356.

### Step 5: Pitch Detection (pYIN)

The separated instrument audio is processed through the **pYIN** (probabilistic YIN) algorithm, available in the `librosa` library.

**How pYIN works:** A musical note is a periodic vibration. An A4 vibrates at 440 times per second. pYIN computes the autocorrelation of the audio signal in small overlapping windows (~23ms each, ~43 frames per second). Autocorrelation asks: "if I slide this waveform forward in time, at what offset does it best match itself?" The offset that produces the best match reveals the fundamental frequency.

pYIN improves on basic autocorrelation by using a Hidden Markov Model to smooth pitch estimates across frames, avoiding octave errors and noise spikes.

Output: a continuous pitch curve for the entire lesson — thousands of data points per minute of playing, each with a confidence score.

```
[time: 28.50s, pitch: 659.2Hz (E5), confidence: 0.93]
[time: 28.52s, pitch: 661.1Hz (E5), confidence: 0.91]
[time: 28.55s, pitch: 698.4Hz (F5), confidence: 0.89]
```

### Step 6: Chroma Feature Extraction

The pitch data (plus the raw spectrum from STFT — Short-Time Fourier Transform) is converted into **chroma features**: 12 values representing energy in each pitch class (C, C#, D, D#, E, F, F#, G, G#, A, A#, B), regardless of octave.

Computed in windows of ~100ms with 50% overlap. A 30-minute lesson with ~15 minutes of playing produces roughly 18,000 chroma frames.

Chroma features are the representation used for score alignment. They're robust to octave differences, timbral variation, and moderate noise — making them ideal for comparing a student's real-world audio to a clean score reference.

### Step 7: Onset Detection

Onset detection identifies the *attack* of each note — the moment a bow contacts a string, a key is struck, or a breath begins a tone.

The algorithm computes **spectral flux** (the rate of change in the frequency spectrum) across consecutive frames. Sudden spikes indicate new note onsets. A neural network refinement layer (from the `madmom` library) improves accuracy.

Output: list of timestamps where new notes begin.

### Step 8: Beat and Tempo Tracking

Onset times are fed into a beat tracking algorithm — specifically, `madmom`'s **RNNBeatProcessor**, a recurrent neural network trained on annotated music to identify beat positions.

Output: beat timestamps + estimated tempo (BPM) per segment. This enables precise tempo tracking per section per lesson, and tempo comparison across weeks.

---

## 8. Score Alignment — How It Works

### The Key Insight: You Already Have the Answer Key

Unlike general music transcription (an open research problem), Orpheus doesn't ask "what is this music?" It asks "how does this performance compare to what we expected?" This constrained problem is dramatically easier because the system already knows the piece from the teacher's verbal identification and has the score in its database.

### Dynamic Time Warping (DTW)

Both the reference score and the student's audio are converted into chroma features (the shared representation). DTW finds the optimal alignment between these two sequences, accounting for tempo variation.

**The intuition:** Imagine the score's chroma sequence along the X axis and the student's audio chroma along the Y axis. DTW finds a path through this grid that minimizes the total distance between aligned frames — while allowing the path to stretch horizontally (student plays slower than the score) or vertically (student plays faster).

**The output:** A mapping from student audio timestamps to score positions.
```
student 0.0s  → score measure 1, beat 1
student 0.8s  → score measure 1, beat 3
student 1.5s  → score measure 2, beat 2
...
student 148.0s → score measure 44, beat 4
```

DTW is not new or experimental — it has been used in speech recognition since the 1970s and in music information retrieval for over 20 years. It is implemented in a few lines of code via `librosa.sequence.dtw`.

### Handling the Messy Reality of Practice

A lesson isn't one continuous performance. Students play, stop, go back, repeat, skip ahead. The system handles this with a segmentation step before alignment:

1. **Silence detection** chops the audio into segments wherever there's a gap (volume drops below threshold for >2 seconds).
2. **Each segment is aligned independently** against the full score using DTW.
3. **Overlap detection** identifies when multiple segments map to the same score region — revealing repetition counts and which measures receive the most attention.

### Confidence Scoring

DTW produces a distance score for each alignment. High distance = poor match = the student might be playing something else, or playing very incorrectly. The system uses this to gate its analysis:

- High confidence (distance < threshold): report measure numbers, detailed analysis
- Medium confidence: report approximate measure ranges, basic metrics
- Low confidence: flag as uncertain, fall back to time-only tracking

**The system never presents uncertain analysis as fact.** Better to say "I couldn't analyze this section clearly" than to report wrong data that erodes teacher trust.

### Intonation Analysis

With alignment complete, the system knows both *what note the student was trying to play* (from the score) and *what pitch they actually produced* (from pYIN). The difference in cents (1 cent = 1/100th of a semitone) reveals intonation accuracy.

Individual deviations aren't interesting. The system looks for **patterns** across the lesson and across weeks:
- "Every upward shift to third position lands 15-20 cents flat" → hand frame issue
- "Consistently sharp on high notes" → squeezing
- "Intonation degrades at faster tempos" → technique breaking down under speed
- "Flat on specific note names" → possible ear training issue

These patterns are detected by rule-based analysis informed by music pedagogy research, not machine learning.

---

## 9. When the Score Doesn't Exist

Not every piece has a MIDI or MusicXML file in the database. The system handles this through a graceful degradation cascade.

### How Much Repertoire Already Exists Digitally

MuseScore's open library has over 1 million user-uploaded scores. IMSLP has tens of thousands of public domain works. Standard teaching repertoire (Suzuki books, ABRSM syllabi, common method books) is well-covered. Estimated coverage of typical lesson content: 60-80% from day one.

### The Cascade When a Score Isn't Found

When the system can't find a referenced piece, it offers options in order from easiest to hardest for the teacher:

**Option 1: Community Match.** Search MuseScore, community uploads from other teachers on the platform, and open repositories. If another teacher has already added the score, Maria can confirm it matches her edition with one tap. One teacher's contribution benefits every future teacher.

**Option 2: Photo Scan (OMR).** The teacher photographs the sheet music. Optical Music Recognition (using Audiveris, open source) converts the image to MusicXML. Accuracy is ~90-95% on cleanly printed music. DTW alignment is robust to local OMR errors because surrounding context anchors the mapping.

The OMR pipeline:
1. Image preprocessing: deskew, binarize, remove shadows
2. Staff line detection, notehead identification, symbol recognition
3. Musical sequence reconstruction → MusicXML output
4. Quality check against time signature and instrument range
5. If confidence > threshold, add to database and use for alignment

**Option 3: Reference Recording.** For pieces with no written score (oral traditions, improvisation, original compositions), the teacher records themselves playing the piece once. This becomes the alignment target via audio-to-audio DTW. The teacher can optionally mark section boundaries during recording ("opening theme," "spiccato section," "coda").

This approach works for any music in any tradition — no notation system required. It's what makes the product universally applicable across Western classical, jazz, Indian classical, West African drumming, folk traditions, and more.

**Option 4: Manual Section Labels.** The teacher defines sections by name without any audio or score reference. The system tracks time per section based on teacher or student tagging, plus overall tempo and repetition data.

**Option 5: No Reference at All.** The system still tracks total playing time, speech content, tempo of playing segments, repetition patterns (via audio self-similarity), and the teacher's verbal instructions. The summary is less precise but not empty.

### The Quality Spectrum

```
Full MusicXML score:
→ Measure-level alignment, precise tempo, intonation analysis,
  week-over-week comparison by measure number
→ "mm. 45-62: ♩=78, up from 70 last week"

OMR-scanned score (approximate):
→ Approximate measure alignment, tempo tracking, basic intonation
→ "mm. ~45-62: ♩≈78"

Reference recording with section labels:
→ Section-level alignment, relative tempo, relative intonation
→ "Spiccato section: ♩≈112, improving"

Manual section labels only:
→ Time per section, overall tempo, repetition count
→ "Worked on Section 2 for 12 minutes"

No reference at all:
→ Total time, playing vs speech ratio, tempo, repetitions,
  verbal instruction capture
→ "19 min playing, focused repetition work around ♩=88-112"
```

Every level is useful. No level is zero. The system always delivers more than the teacher had before.

### The Flywheel Effect

The score database grows through teacher contributions:
- Month 1: ~5,000 common pieces → ~60% full alignment coverage
- Month 6: ~9,000 pieces → ~80% coverage
- Year 1: ~15,000 pieces → ~90% coverage
- Year 2: ~25,000+ pieces → ~95% coverage

Every teacher who scans a score or records a reference contributes to a shared commons. This creates a network effect: the product gets measurably better for every teacher as more teachers join.

---

## 10. What Makes This Different From Generic Meeting AI

The parallel to corporate meeting AI (Otter.ai, Fireflies, Granola) is valid and validating — the core behavior pattern ("I was busy being present, the AI handles documentation") is identical. But the differentiation is critical for defensibility.

### What Generic Meeting AI Captures

A meeting AI transcribes speech and extracts action items. In a music lesson, it would produce:
> "Teacher asked student to play Vivaldi. Discussed fixing a passage near a key change. Teacher noted student was rushing and suggested playing slower. Teacher praised improvement."

### What It Misses

- **Which passage specifically?** Measures 45-62. Meeting AI has no idea.
- **What tempo?** ♩=72. Meeting AI can't detect this.
- **Did the second attempt improve?** Yes, tempo dropped to ♩=64 and pitch accuracy improved. Meeting AI doesn't know.
- **Week-over-week comparison?** Same passage was ♩=60 last week. Meeting AI has no longitudinal music data.
- **Actionable practice assignment?** "Measures 45-62, target ♩=76" vs the vague "the passage near the key change, slower."

### The Dual-Stream Architecture

Orpheus processes two streams simultaneously:

1. **Speech stream** → Whisper transcription → verbal instructions, piece identification, pedagogical context
2. **Instrument stream** → Music analysis → what was played, how well, which measures, at what tempo, with what intonation

These are merged into a unified lesson timeline where verbal context enriches musical analysis and vice versa. The system understands that the 45 seconds of violin between two verbal comments isn't background noise — it's the primary content of the lesson.

### The Moat

This dual-stream intelligence is the product's defensible moat, analogous to how:
- Generic AI can transcribe a doctor visit, but **Abridge** understands diagnoses and medications
- Generic AI can summarize a sales call, but **Gong** understands deal stages and objections
- Generic AI can transcribe court proceedings, but legal AI understands case citations

A generic meeting AI bolted onto studio management software won't replicate the music analysis pipeline without rebuilding it from scratch. The speech transcription is table stakes. The music intelligence is the product.

---

## 11. Progressive Onboarding

### The Golden Rule

The teacher should get value from the product within their very first lesson, with near-zero setup. Every piece of information the system requests should come *after* the teacher has seen what the product does with the data it already has.

### How Information Builds Itself

The system populates itself from observed lessons, never from forms:

**After lesson 1:** Student name, one piece, rough tempo baseline.

**After lesson 3:** Two pieces, challenging sections identified, tempo progression, teacher's typical lesson structure.

**After lesson 8:** Full active repertoire, progress rate, technical focus areas, one completed piece.

**After 3 months:** Rich student profile, progress trends, learning patterns, recital readiness estimates — all from observed lessons, zero forms filled out.

### The Voice Dump (Optional, After Trust Is Earned)

After a few weeks, the system offers an option for adding historical context:

> "Want to give me some background on Sofia? Just talk for a minute — I'll sort it out."

The teacher speaks naturally: "Sofia's been playing for three years, finished Suzuki Book 2 last spring, working on the Vivaldi concerto and some Kreutzer etudes, struggles with intonation in high positions, wants to audition for youth orchestra in June."

60 seconds of speech, transcribed and structured automatically. Far more natural than filling out a form.

### What to Never Ask Up Front

- Student ages, levels, or detailed profiles
- Lesson schedules (the system infers these from patterns)
- Repertoire lists (detected from lesson content)
- Method books or curricula (detected from speech)
- Parent contact information (prompted only when the teacher wants to send a message)
- Payment information (not until the free trial naturally ends)

### The Anti-Pattern

```
❌ "Welcome! Let's set up your studio.
    Step 1 of 7: Enter your students..."
```

Seven steps of data entry before seeing any value is a death sentence. The teacher closes the app and never returns.

```
✅ "Ready when you are. Just hit record."
```

---

## 12. Edge Cases and Solutions

### The Lesson Itself

**Teacher and student play simultaneously.** Two of the same instrument on one mic is hard to separate. Solution: don't try. Tag these segments as "joint playing" and extract what's available from the combined signal — section identification, tempo, duration. The summary notes "worked on mm. 45-62 together (joint playing, 8 minutes, ~♩=72)." Honest, useful, no false precision.

**Teacher demonstrates alone.** Risk: the system attributes a flawless performance to the student, skewing progress data. Detection signals: sudden quality jump (student doesn't go from shaky to virtuosic in 30 seconds), speech context ("let me show you," "listen to this"), and consistency with known student ability level. When uncertain, the summary includes a one-tap confirmation: "2:30-3:15 — played at ♩=120 [teacher demo?] [Yes, that was me] [No, that was the student]." Each correction trains the system.

**Non-playing lessons.** Theory discussion, score analysis, listening sessions, performance coaching. The system detects minimal instrument audio and switches to speech-only mode, producing a meeting-style summary: topics discussed, key points, action items. "Lesson with Sofia — theory/discussion. Discussed sonata form structure using the Vivaldi as an example..."

**Very short or interrupted lessons.** Student arrives late, parent interrupts, student has an emotional moment. The system handles messy, fragmented sessions gracefully — producing whatever summary it can from the available content without generating tone-deaf metrics like "only 12 minutes of productive practice detected."

**Group lessons and masterclasses.** Multiple students in the room, taking turns playing. This requires a different mode — the system tracks multiple student names and attempts to assign playing segments to the correct student. Marked as a "not now" feature for MVP.

### Music Analysis

**Student plays a piece not in the database.** Graceful degradation to time-only tracking + speech-based documentation + the score acquisition cascade (community match → OMR scan → reference recording → manual sections → no reference).

**Student plays from memory incorrectly.** They've memorized the piece wrong — skipping bars, adding extra repeats. DTW alignment gets confused. The system detects high alignment distance, flags the segment as uncertain, and reports what it can without forcing a bad alignment.

**Pieces with flexible content.** Cadenzas, Baroque ornaments, jazz improvisation, rubato. The system cannot treat these as "errors." Sections marked as flexible in the score reference (if available) get relaxed analysis — tracking time and general character rather than note-by-note accuracy.

**Transposing instruments.** A B♭ clarinet sounds a whole step lower than written. A guitar with a capo shifts all pitches. The system needs to account for transposition in the alignment — shifting the reference chroma to match the sounding pitch. Solvable but must be configured per instrument/setup.

**Extended techniques.** Harmonics, pizzicato, col legno, multiphonics, vocal effects. These produce sounds without clear pitch content. The pitch detection layer produces unreliable results. The system recognizes these segments and tracks time without attempting pitch analysis.

**Non-standard tuning systems.** Baroque tuning (A=415), orchestral tuning (A=442-443), non-Western tuning systems with microtones and quarter tones. The system defaults to A=440 equal temperament. Teachers can adjust the reference tuning in settings (prompted after onboarding, not during).

### Recording Management

**Forgot to start recording.** The 5-minute rolling pre-buffer rescues this. Teacher hits record 5 minutes late; app asks "Want to include the last 5 minutes?" One tap recovers the missed content.

**Forgot to stop recording.** Lesson ends, teacher chats with a parent, next student begins. Multiple defense layers: (1) auto-detection of extended silence/non-lesson speech prompts "Lesson still going?", (2) post-processing detects natural boundaries (different repertoire, teacher says a different name), (3) student name detection from speech splits recordings, (4) any non-lesson speech is automatically excluded from summaries.

**Forgot to record the whole day.** No guilt, no notifications about missed sessions. When the teacher opens the app next, it simply says "Ready for today's first lesson?"

### Sensitive Language

**Teacher-facing summaries** use direct, professional language: "Intonation in third position: consistently flat by 15-20 cents. Likely hand frame issue."

**Parent-facing summaries** reframe around process, not evaluation:
- Never use: struggled, failed, couldn't, wrong, mistake, problem, weak
- Always use: working on, developing, building, exploring, refining
- Always lead with something positive
- Always include a concrete, actionable way for the parent to help

Teachers can adjust the communication tone preference (encouraging/gentle → direct/detailed) after onboarding.

**Sensitive personal moments.** If a student discusses personal issues (bullying, family problems, mental health), a sensitivity filter on the speech transcript excludes these topics from summaries and parent communications. The audio is deleted. The system does not flag these to the teacher (who was present) and does not store them.

### Privacy and Safety

**Core architecture decision:** Process-and-delete by default. Audio is processed, structured data is extracted, audio is immediately deleted. Only the summary and structured data persist. Teachers can opt into audio retention (with appropriate consent) if they want to relisten to lesson segments.

**Consent for minors:** When a teacher first records a lesson with a minor, the app prompts for parental consent. A simple message is sent to the parent explaining what the system does and how data is handled. One-tap consent. If the parent declines, the teacher can still use the app in manual mode (no audio processing).

**Jurisdictional compliance:**
- US: COPPA (parental consent for under-13), FERPA (if connected to schools)
- EU: GDPR (explicit consent, right to deletion, data minimization)
- Design for the strictest standard (GDPR + COPPA) and apply everywhere

**Teacher liability protection:** The "process and delete" default means no recordings of minors sitting on servers. Marketing emphasizes: "We never store recordings of your students. We listen, we learn, we forget."

### Technical

**Bad microphone quality.** Budget Android phones have worse microphones than iPhones. The system runs a quick audio quality assessment and adjusts analysis ambitions: full analysis for good mics, reduced analysis for mediocre, basic for poor. The teacher still gets value at every level.

**Background noise.** Constant noise (HVAC, traffic) is handled by spectral subtraction. Intermittent noise (dog barking, door slamming) is handled by transient detection and masking. Other instruments bleeding through walls are harder but manageable if the student's instrument dominates the signal.

**Offline support.** Many lessons happen in locations with poor connectivity. The app records locally and queues for upload. On-device processing handles basic analysis (pitch, onset, beat tracking) immediately. Server-side processing (source separation, LLM narrative) happens when connectivity is available. The teacher gets a basic summary immediately and a rich summary later.

**Simultaneous user spikes.** After-school lessons end around 4-5pm, creating processing demand spikes. Infrastructure must handle burst patterns with auto-scaling GPU instances.

**Very long lessons.** Some teachers do 90-minute or 2-hour lessons. The pipeline must handle large files without the teacher waiting 10+ minutes for a summary.

### Long-Term Data

**Data portability.** When a student changes teachers, their progress data should transfer. The system supports full data export in readable format (PDF reports + CSV data + JSON structured data).

**Teacher departure.** Teachers who stop using the product can export all student data. Data is never held hostage to prevent churn.

**Year-over-year analysis.** After extended use, the data tells powerful stories: "Sofia's average time to learn a new piece decreased from 8 weeks to 5 weeks over the past year." These longitudinal insights are the ultimate retention hook.

---

## 13. Professional Protection — Documentation as Evidence

### The Unspoken Problem

Music teachers work behind closed doors, one-on-one with other people's children. That's a position of enormous trust. When things go wrong — a parent disputes progress, claims the teacher isn't doing their job, argues about fees, or makes accusations about conduct — the teacher has zero evidence of what actually happened in any lesson. It's their word against the parent's.

This creates a constant low-level anxiety that most teachers never talk about openly. Without records, every disagreement becomes "I said, you said." And the teacher always loses that argument, because the parent is the paying customer.

Common scenarios where documentation would have protected the teacher:

- Parent claims child hasn't improved after 6 months of lessons. Teacher has no data to show otherwise.
- Parent disputes what was assigned for practice. Teacher can't prove what was said.
- Parent says they were never informed about a recital, a fee change, or a scheduling issue. No record of the conversation.
- Student isn't progressing because they don't practice, but parent blames the teacher. No evidence of consistent assignment delivery.
- In rare but serious cases: false accusations about conduct during one-on-one lessons with minors.

### How Orpheus Provides Protection

Every lesson automatically produces a set of verifiable records that serve as professional documentation:

**Timestamped lesson records.** Each lesson summary includes the date, start time, end time, duration, student name, pieces covered, sections worked on, tempo data, and practice assignments — all derived from audio analysis, not subjective notes. This is as close to objective documentation as you can get without a video camera.

**Parent communication log.** Every message sent to a parent is archived with full content, delivery timestamp, and confirmation status. If a parent claims "you never told us about the recital," the log shows the message was delivered at 3:42pm on February 18th, and here's exactly what it said.

**Assignment history.** Every practice assignment is recorded and linked to a specific lesson. If a student isn't progressing because they're not following assignments, the record shows what was assigned, when, and how many weeks the same issues persisted.

**Longitudinal progress data.** If a parent says "my child hasn't improved at all this term," the teacher can show concrete data: tempo progression on specific pieces, repertoire completed, technique development metrics over weeks and months. The data tells the story objectively.

**Attendance and duration records.** Automatic tracking of lesson count, total instruction time, cancellations, and no-shows per student per term. Useful for fee disputes and for demonstrating consistent service delivery.

### The Documentation Trail

Every interaction with Orpheus generates records in this hierarchy:

```
Student Record
├── Lesson Log (every lesson, auto-generated)
│   ├── Date, time, duration
│   ├── Pieces covered with section details
│   ├── Tempo and progress measurements
│   ├── Teacher summary (detailed, technical)
│   ├── Practice assignments given
│   └── Processing metadata (confidence scores)
│
├── Communication Log (every parent message)
│   ├── Message content (exact text sent)
│   ├── Delivery timestamp
│   ├── Delivery method (email/SMS)
│   ├── Delivery confirmation
│   └── Parent response (if any)
│
├── Assignment History (running list)
│   ├── What was assigned
│   ├── When it was assigned
│   ├── Whether it was completed (inferred from next lesson)
│   └── How many weeks the same assignment persisted
│
├── Progress Timeline (computed automatically)
│   ├── Tempo trends per piece/section
│   ├── Repertoire completion dates
│   ├── Technique development markers
│   └── Week-over-week improvement metrics
│
└── Attendance Record
    ├── Total lessons delivered
    ├── Cancellations (teacher vs student initiated)
    ├── No-shows
    └── Total instruction minutes per term
```

### Formal Documentation Mode

Teachers can toggle between two summary styles:

**Standard mode (default):** Concise, conversational teacher summaries designed for quick review. "Sofia's Vivaldi is coming along — string crossings are cleaner this week, hit ♩=78. Needs more work on the development section."

**Formal documentation mode:** Clinical, detailed records suitable for professional or legal purposes. Structured like:

```
LESSON RECORD
Date: February 18, 2026
Student: Sofia [Last Name]
Time: 2:00 PM – 2:32 PM (32 minutes)
Teacher: [Teacher Name]

CONTENT COVERED:
1. Vivaldi Concerto in A minor, RV 356, Mvt. 1
   - Measures 1-44: Complete run-through (♩=78, prev. ♩=70)
   - Measures 45-62: Focused work on string crossings
     (4 repetitions, tempo range ♩=62-70)
   - Measures 78-95: Development section sight-read

OBSERVATIONS:
- String crossing technique improving consistently
- Intonation in third position remains area of focus
- Student demonstrated preparation of assigned material

ASSIGNMENTS GIVEN:
1. Measures 45-62: target ♩=80, slow practice with metronome
2. Measures 78-95: hands-separate practice, learn notes
3. Scale: A minor, 3 octaves, ♩=72

PREVIOUS ASSIGNMENTS STATUS:
- Measures 1-44 to ♩=76: ACHIEVED (♩=78)
- Measures 45-62 slow practice: PARTIALLY ACHIEVED
- A minor scale 2 octaves: ACHIEVED
```

### Export for Disputes

When a teacher needs to share documentation — with a studio owner, professional organization, parent in a formal setting, or legal counsel — Orpheus can export a complete student record as a clean PDF document:

- Filterable by date range
- Includes all lesson summaries, communications, assignments, and progress data
- Formatted professionally with clear headers and timestamps
- Optionally includes a cover sheet summarizing total lessons, attendance rate, pieces completed, and measurable progress

The export is designed to look authoritative and professional. It communicates: "This teacher maintains meticulous records and takes their professional responsibilities seriously."

### Verification and Integrity

For the documentation to serve as credible evidence, it needs to be trustworthy:

**Immutable records.** Once a lesson summary is confirmed by the teacher, it cannot be edited retroactively. The teacher can add a note or amendment (which is timestamped separately), but the original record is preserved. This prevents either party from claiming records were altered after the fact.

**Processing metadata.** Each record includes metadata about how it was generated: "Summary derived from audio analysis of 32-minute recording processed at 2:35 PM on February 18, 2026. Confidence: high." This establishes that the record was machine-generated from real lesson audio, not fabricated.

**Delivery receipts.** Parent communications include delivery confirmation. The system tracks whether the message was successfully delivered, and via which channel. This is the teacher's proof that the parent was informed.

### Positioning Implications

This use case reframes Orpheus from "nice productivity tool" to **professional necessity:**

**Before:** "Orpheus writes your lesson notes so you don't have to."
→ Nice to have. Teachers have survived without it for centuries.

**After:** "Orpheus gives you a complete, verifiable record of every lesson you teach — protecting your students' progress and your professional reputation."
→ That's insurance. Teachers don't cancel insurance.

This positioning works especially well with professional organizations (MTNA, ESTA, Suzuki associations). "Responsible teachers document their lessons" is a message these organizations can champion — it elevates the profession and protects both teachers and students.

---

## 14. The Codex — Orpheus's Music Education Knowledge Graph

### Beyond Simple Repertoire Recommendations

**The Codex** is Orpheus's collective knowledge engine — named for the ancient manuscripts of accumulated wisdom. It's the long-term platform play that transforms Orpheus from a lesson documentation tool into the central infrastructure of music education.

The original concept was a Repertoire Graph — "teacher finishes piece A, starts piece B, that's an edge." Valuable, but it's actually the simplest form of knowledge graph you could build from this data.

Think about what Orpheus actually observes over thousands of lessons: which pieces teachers assign and in what order, how long each piece takes each student to learn, which sections cause the most difficulty, what tempo trajectory students follow, which technical issues appear in which pieces, what verbal instructions teachers give for specific passages, what corrections recur across students on the same piece, and how students with different profiles respond to the same repertoire.

That's not just a "piece A → piece B" graph. That's a comprehensive model of how musical skill develops — encoded in data that has never been systematically collected before.

The Codex has three layers, each building on the last.

### Layer 1: The Repertoire Sequencing Graph

**What it models:** Which pieces teachers assign, in what order, and what transitions are most common.

**Nodes** are pieces of music with rich metadata: instrument, tradition/genre, difficulty dimensions (technical, musical, rhythmic, reading), required techniques, emotional character, historical context, available editions.

**Edges** are "taught after" relationships weighted by how many teachers make that transition:

```
Vivaldi A minor ──(67 teachers)──→ Bach A minor
                ──(43 teachers)──→ Accolay A minor
                ──(28 teachers)──→ Kreisler P&A
```

**How it builds itself:** Every time a teacher finishes one piece and starts another with a student, Orpheus observes the transition and creates/strengthens an edge. No teacher explicitly contributes. The graph builds organically from the natural flow of thousands of lessons worldwide.

**What it answers:** "What should I teach next?"

**Personalized recommendations** filter by the student's observed strengths and weaknesses, musical interests (detected from repertoire history), similar student profiles (collaborative filtering), and the teacher's preferred pedagogical philosophy. A teacher in Nairobi might discover that a Brazilian choro piece is the perfect bridge between two classical works — a connection they'd never have made from their own experience alone.

### Layer 2: The Technique Dependency Graph

This is where The Codex becomes genuinely powerful. Every piece requires certain techniques. Every technique has prerequisites. This forms a separate but interconnected graph.

**Technique nodes** represent specific musical skills:
```
├── "Clean string crossings at ♩=80+"
├── "Third position shifting (upward)"
├── "Spiccato in lower half of bow"
├── "Vibrato on sustained notes"
├── "Double stops: thirds"
└── ...hundreds more per instrument
```

**Piece-to-technique edges** capture which techniques each piece develops:
```
├── Vivaldi A minor → "string crossings," "third position shifting"
├── Kreutzer Etude #8 → "bowing control," "string crossings"
├── Bach A minor → "polyphonic thinking," "sustaining tone"
```

**Technique-to-technique edges** capture prerequisites:
```
├── "String crossings at ♩=80" requires "String crossings at ♩=60"
├── "Third position shifting" requires "First position mastery"
├── "Spiccato" requires "Controlled detaché"
```

**How it builds itself from lesson data:** The system observes that when teachers work on the Vivaldi A minor, the sections that get the most repetitions and the slowest tempos consistently involve string crossings and position shifts. Across hundreds of teachers, this pattern is overwhelming — the Vivaldi A minor is primarily a vehicle for developing string crossing and shifting skills.

The system also observes that students who master string crossings at ♩=60 in Suzuki Book 3 pieces are the ones who successfully handle the Vivaldi's string crossings at ♩=80. Students who skip that intermediate step struggle. That's a technique dependency edge — discovered from data, not from anyone explicitly encoding it.

**What it answers:** Not just "what piece next?" but "what specific skills does this student need to develop, and which pieces develop those skills?"

**Example of technique-aware recommendation:**

> Sofia has developed strong string crossing skills (demonstrated in the Vivaldi at ♩=84). Her third position shifting is solid. However, her vibrato is still developing and her spiccato hasn't been addressed yet.
>
> The Bach A minor would build on her strengths (string crossings, shifting) and introduce polyphonic thinking — but it also demands sustained vibrato, which she's not ready for.
>
> Consider: Kreisler Praeludium and Allegro develops spiccato (a gap in her technique) while leveraging her strong shifting. Or, spend 3-4 weeks on vibrato development with the Accolay (which is more forgiving of developing vibrato) before tackling the Bach.

That's not just repertoire recommendation. That's pedagogical reasoning — the kind that takes a teacher decades of experience to develop. The Codex makes it available to every teacher on the platform, including a new teacher in their first year.

### Layer 3: The Pedagogical Instruction Graph

This is the most ambitious layer, and the one that leverages the speech transcription data in a way no other product can.

Over thousands of lessons on the same piece, teachers say remarkably similar things at remarkably similar moments. When students hit the string crossing passage in the Vivaldi, teachers worldwide give variations of the same core instructions:

- "Keep your bow arm relaxed at the string change"
- "Think of the bow drawing a figure eight"
- "Practice on open strings first, then add the left hand"
- "The elbow leads the string crossing, not the wrist"

The system extracts and clusters these instructions, linking them to specific passages in specific pieces:

```
Piece: Vivaldi A minor, mm. 45-62 (string crossings)

Common teacher instructions (clustered by approach):

├── Cluster 1 — Bow mechanics (62% of teachers):
│   "Keep bow arm relaxed," "elbow leads the crossing"
│   Avg student improvement after this instruction: +12% tempo
│
├── Cluster 2 — Isolation practice (45% of teachers):
│   "Practice on open strings first," "separate the hands"
│   Avg student improvement: +18% tempo (slower initial, faster ramp)
│
├── Cluster 3 — Mental imagery (28% of teachers):
│   "Think figure eight," "imagine painting a rainbow"
│   Avg student improvement: +8% tempo, +15% intonation
│
└── Cluster 4 — Rhythmic variation (21% of teachers):
    "Try it dotted rhythm," "long-short, then short-long"
    Avg student improvement: +22% tempo (highest!)
```

**How instruction clustering works technically:**

Teacher instructions need to be clustered because every teacher phrases things differently. "Keep your bow arm relaxed" and "don't tense up at the string change" and "let your arm breathe through the crossing" are all expressing the same pedagogical idea.

The system uses embedding-based clustering:
1. Each instruction extracted from speech transcripts is passed through a sentence transformer model to generate a semantic embedding
2. Similar instructions are clustered using HDBSCAN or similar density-based clustering
3. Each cluster is labeled by its most representative instruction
4. Clusters are linked to specific passages via the score alignment data

Over time, the clusters stabilize and become the canonical "teaching approaches" for each passage.

**How effectiveness is measured:**

The signal comes from within-lesson improvement and between-lesson improvement.

Within-lesson: Teacher gives instruction X at timestamp T. Student plays the passage again. Did tempo improve? Did intonation improve? Did the passage get further before breaking down? This is measurable from the audio analysis of subsequent attempts within the same lesson.

Between-lesson: Teacher used approach X in week 1. By week 3, has the student's performance on this passage improved more or less than the platform average? This requires longitudinal tracking across lessons.

Neither signal is perfect individually. Within-lesson improvement might be temporary. Between-lesson improvement has confounding factors (the student might have practiced differently). But across thousands of data points, the noise averages out and real patterns emerge. This is statistical power through scale — the same principle that makes clinical trials work.

**What it answers:** "For this specific passage with this specific student, which teaching approach is most likely to be effective?"

### How The Codex Changes the Product

**For individual teachers — the "Teaching Copilot":**

After a lesson where Sofia struggled with the string crossings, the system could gently surface:

> Other teachers have found success with this passage using rhythmic variation exercises (dotted rhythms, reversed dotted rhythms). Students who used this approach improved tempo 22% faster on average. Want to try this next week?

It's not telling Maria how to teach. It's offering a colleague's approach she might not have considered — backed by data from hundreds of real outcomes.

This is the equivalent of a first-year teacher having access to the collective wisdom of every master teacher on the planet. That's transformative for the profession.

**For the platform — a searchable teaching knowledge base:**

A teacher preparing to teach a new piece they've never taught before searches The Codex:

```
Barber Violin Concerto, Mvt. 1

Typically assigned to students at level: Advanced (post-Bruch, post-Mendelssohn)
Average time to lesson-ready: 12-16 weeks

Common challenge areas:
1. Opening theme: sustained intonation in high positions (mm. 1-24)
   → Most effective approaches: drone practice (67%), 
     slow intonation work with piano (45%)

2. Rhythmic complexity in development (mm. 89-124)
   → Most effective approaches: metronome subdivision (58%), 
     singing first (34%)

3. Cadenza: pacing and structural coherence
   → Most effective approaches: recording and self-evaluation (42%), 
     macro-rehearsal (38%)

Teachers who assign this piece typically pair it with:
→ Dont Etude Op. 35 #2 (prepares sustained high position playing)
→ Ysaÿe Solo Sonata #3 (develops similar rhythmic independence)
```

That's a teaching companion unlike anything that exists. It turns the collective experience of the entire platform into structured, searchable, actionable knowledge.

**For music education research — a data goldmine:**

Aggregated and anonymized, this data answers questions the field has debated for decades:

- Do students who start with Suzuki method progress differently than those who start with traditional method books?
- What's the optimal balance of technical exercises vs repertoire in lesson time?
- At what point does tempo-drilling a passage become counterproductive (diminishing returns)?
- Do students who learn a wider variety of shorter pieces develop faster than those who spend longer on fewer, larger works?
- How does student age correlate with learning trajectory for specific techniques?
- What teaching approaches are most effective for students who plateau?

No music education researcher has ever had access to this volume of real-world pedagogical data. Partnerships with universities and conservatories could establish the platform as the definitive source of evidence-based music pedagogy.

### The Codex — Data Extraction Pipeline

```
Every processed lesson feeds The Codex:

LESSON JSON
    ↓
Extract entities:
├── Pieces played (with sections)
├── Techniques observed (from audio analysis + speech context)
├── Instructions given (from speech transcript)
├── Tempo/intonation measurements
├── Repetition patterns
├── Student response to corrections (did attempt #2 improve?)
    ↓
Update graph nodes and edges:
├── Piece node: update aggregate difficulty metrics
├── Technique edges: strengthen piece→technique connections
├── Sequence edges: if new piece started, create/strengthen 
│   transition edge from previous piece
├── Instruction clusters: add teacher's instructions to cluster
│   for this passage, recompute clusters periodically
└── Effectiveness signals: link instruction approach to 
    measured improvement in subsequent attempts/lessons
```

### Network Effects and Competitive Moat

More teachers → more edges → better recommendations → more value → more teachers. The Codex gets dramatically better at scale, and the data is nearly impossible to replicate.

This is the same dynamic that makes Google Maps hard to compete with — not because maps are hard to draw, but because the real-time traffic data from billions of users is impossible to replicate. Any competitor can build an audio analysis pipeline (the libraries are open source). But The Codex is built from years of accumulated lesson data from thousands of teachers. You can't replicate that by launching a competing product.

### Connection to Orpheus — The Feedback Loop

Orpheus's lesson intelligence and The Codex form a self-reinforcing feedback loop:

```
Orpheus → captures HOW the student is progressing
    ↓
The Codex → recommends WHAT to assign next
    ↓
The Codex → suggests HOW to teach challenging passages
    ↓
New assignment feeds back into Orpheus
    ↓
Lesson data makes The Codex smarter
    ↓
Smarter Codex → better recommendations → better outcomes
```

Over time, this builds a comprehensive map of how musical skill actually develops — informed by real data from thousands of student journeys worldwide. That's not an app. That's infrastructure for music education.

### The Long-Term Strategic Arc

```
Year 1:  "Orpheus writes my lesson notes for me"
         → Teacher utility, lesson documentation
         → The Codex silently accumulating data

Year 2:  "Orpheus helps me teach better"
         → Teaching copilot with passage-specific guidance
         → The Codex powers technique-aware repertoire recommendations

Year 3:  "Orpheus is how music education works now"
         → Platform with the world's largest pedagogical dataset
         → The Codex becomes the definitive source of teaching wisdom
         → Multiple revenue streams, institutional partnerships
```

---

## 15. Technology Stack and Costs

### Open Source (Free)

| Component | Library | License | Purpose |
|---|---|---|---|
| Audio analysis | librosa | ISC (free) | Pitch detection, chroma features, DTW, onset detection |
| Source separation | Demucs (Meta) | MIT (free) | Split speech from instrument |
| Pitch detection | pYIN / CREPE | Open source | Fundamental frequency estimation |
| Beat tracking | madmom | Open source | Tempo and beat position detection |
| Speech-to-text | Whisper (OpenAI) | MIT (free) | Transcription in 99 languages |
| Voice activity detection | Silero VAD | MIT (free) | Real-time speech/music classification |
| Optical music recognition | Audiveris | AGPL (free) | Sheet music → MusicXML |

The entire core pipeline — audio analysis, source separation, pitch detection, score alignment, beat tracking, speech transcription — is built from free, open-source components.

### Paid Services

| Service | Cost | Notes |
|---|---|---|
| LLM API (narrative generation) | $0.005-0.02 per lesson | ~1000 tokens in, ~500 out. ~$0.50-2.00/month per teacher |
| GPU compute (Demucs) | $0.01-0.05 per lesson | Cloud GPU on-demand |
| CPU compute (analysis pipeline) | $50-200/month | Handles hundreds of teachers |
| Storage (S3) | $5-20/month | Audio processed and deleted; only structured data persists |
| Email delivery (SendGrid) | $0-20/month | Parent communications |
| SMS delivery (Twilio) | $0.01 per message | Optional |

### Full Infrastructure Cost at Scale

| Scale | Monthly Cost | Revenue (at $20/teacher) | Margin |
|---|---|---|---|
| 100 teachers | $200-500 | $2,000 | ~80% |
| 500 teachers | $500-1,200 | $10,000 | ~90% |
| 1,000 teachers | $800-2,000 | $20,000 | ~92% |
| 5,000 teachers | $2,000-5,000 | $100,000 | ~96% |

Costs scale sublinearly — fixed infrastructure is amortized across more users. Margins improve with scale.

### The Real Costs

The expensive parts are not technical:
- **Engineering time:** Months of development to stitch the pipeline together, build the apps, handle edge cases.
- **Design and UX research:** Time with real teachers to make the interface feel effortless.
- **Go-to-market:** Reaching a fragmented market of independent teachers through professional organizations, conventions, social media groups, and word of mouth.

---

## 16. Business Model

### Target Market

**Primary:** Private music teachers (the initial wedge). Over 500,000 in the US alone registered with organizations like MTNA. Millions worldwide. They are independent professionals who make their own purchasing decisions — no admin approval needed.

**Secondary:** Music schools and conservatory studios. Multiple teachers under one organization.

**Tertiary:** School music programs (band, orchestra, choir directors). Larger organizations, longer sales cycles, but massive potential.

### Pricing

The comparison isn't other music apps — it's the combination of tools teachers currently cobble together:
- Lesson notebook: $0-10/month
- Studio management software: $15-25/month
- Parent communication effort: priceless time
- Progress tracking: doesn't exist

**Suggested pricing:** $15-30/month for a private teacher, or $1-2/student/month. A studio of 25 students = $25-50/month.

**Regional pricing** for international markets — a teacher in Mumbai cannot pay the same as one in Manhattan.

**Free tier:** Limited to 5 students, basic summaries only. Enough to demonstrate value, constrained enough to incentivize upgrade.

### Retention Hooks

- **Longitudinal data:** After 3+ months, the progress tracking and historical record become hard to give up.
- **Parent communications:** Once parents are accustomed to receiving updates, stopping them creates friction.
- **The Codex:** Personalized recommendations improve with usage history.
- **Quarterly progress reports:** A "wow" moment that showcases the accumulated value of the data.

### Competitive Moat

1. **Music-specific intelligence.** Generic meeting AI and generic studio management can't replicate the audio analysis pipeline without rebuilding it.
2. **The Codex (three-layer Knowledge Graph).** The Repertoire Sequencing Graph, Technique Dependency Graph, and Pedagogical Instruction Graph create compounding network effects that are impossible to replicate without the same volume of real-world lesson data accumulated over years.
3. **Score database as shared commons.** Teacher contributions create a growing asset that benefits everyone.
4. **Switching costs from accumulated data.** Months of progress tracking history are lost if a teacher leaves.

### Additional Revenue Streams (Year 2+, Enabled by The Codex)

**For institutions:** Conservatories and music schools access aggregated analytics about their students, faculty teaching patterns, and comparison to platform-wide benchmarks. "Your violin faculty averages 8 weeks on Suzuki Book 3 pieces; the platform average is 6. Here's what the fastest-progressing studios do differently." Priced as institutional subscriptions.

**For publishers:** Music publishers pay for data on which pieces are most taught, which are being dropped from curricula, and which gaps in repertoire exist at specific levels. "There's high demand for intermediate violin pieces that develop spiccato in a lyrical context — and almost no pieces in the database fill that niche." Priced as data licensing agreements.

**For researchers:** Licensed access to anonymized, aggregated pedagogical data for academic research. Partnerships with university music education programs. Priced as research partnerships or data access fees.

---

## 17. MVP Scope and Build Plan

### The Hypothesis to Test

**Do music teachers check an auto-generated lesson summary before their next lesson?** If yes, the product is working. If no, we need to understand why before building anything else.

### MVP Feature Set

**Include:**
- Audio recording during lessons (phone mic)
- Source separation (speech + instrument)
- Speech transcription and piece identification
- Score alignment for pieces in the initial database
- Basic tempo tracking per section
- Repetition counting
- Auto-generated teacher summary (standard + formal documentation mode)
- Auto-generated parent message (one-tap send)
- **Parent communication log with delivery timestamps and confirmation**
- **Assignment tracking with status updates (achieved/partial/not attempted)**
- **Lesson confirmation flow — locks summary as immutable record**
- **Student record export as PDF (filterable by date range)**
- Pre-lesson brief showing last week's summary
- Student list with basic history

**Exclude (add later):**
- Intonation analysis and pattern detection
- Practice behavior classification
- LLM-generated practice assignments (manual for MVP)
- OMR sheet music scanning
- Reference recording alignment
- Attendance analytics dashboard (Phase 2)
- Repertoire Graph recommendations (Phase 4 — The Codex)
- Group lesson mode
- Multiple teacher per student support
- Monthly progress reports (manual for MVP)

### Initial Scope Constraints

- **One instrument family:** Violin (monophonic, well-studied, huge private lesson market, Suzuki repertoire is widely available in MusicXML)
- **Score database:** Suzuki violin repertoire (Books 1-10, ~240 pieces) + standard classical violin concertos and etudes (~500 additional pieces)
- **Platform:** Web-first (mobile-responsive Next.js app, works on phone browsers — no native app needed for pilot)

### Pilot Design

**10 violin teachers, 4 weeks:**
- Week 1: Onboard, record 3-4 lessons each, gather first impressions
- Week 2: Iterate on summary quality based on feedback, check if teachers reference summaries before lessons
- Week 3: Enable parent communications, gather parent feedback
- Week 4: Exit interviews — what's valuable, what's missing, what would make them pay

**Key metrics:**
- Summary review rate (do teachers look at it before the next lesson?)
- Summary accuracy (do teachers need to correct it frequently?)
- Time-to-value (how quickly does the teacher see the benefit?)
- Parent engagement (do parents read the messages? do they respond?)
- Retention intent ("would you keep using this? would you pay?")

### Success Criteria

The pilot succeeds if:
- 7+ of 10 teachers check summaries before most lessons by week 3
- Summary accuracy requires minimal correction (< 2 edits per summary on average)
- At least 5 teachers express willingness to pay
- At least 3 teachers independently send parent communications

### Post-Pilot Roadmap

**Phase 2 (Months 2-4):** Add intonation analysis, practice assignment generation, OMR scanning, expand to piano. Begin silently accumulating data for The Codex (repertoire transitions, technique associations).

**Phase 3 (Months 4-8):** Monthly progress reports, reference recording alignment, expand instrument support, Android version. Launch Codex Layer 1: Repertoire Graph — "other teachers assign these pieces next."

**Phase 4 (Months 8-12):** Codex Layer 2: Technique Map — technique-aware repertoire recommendations. Group lesson mode. Begin instruction clustering pipeline for Codex Layer 3.

**Phase 5 (Year 2):** Codex Layer 3: Teaching Insights — passage-specific teaching approach recommendations with effectiveness data. Teaching Copilot features. Searchable Codex knowledge base.

**Phase 6 (Year 2-3):** Institutional analytics dashboards powered by The Codex. Publisher data partnerships. Research data licensing. Evidence-based pedagogy publications. API for third-party studio management tools.

---

## Appendix A: The Lesson Processing Pipeline — Complete Technical Reference

```
RECORDING PHASE (on-device, real-time):
├── Audio capture: 44.1kHz, mono, AAC/Opus 64kbps
├── Rolling 5-min pre-buffer
├── Silero VAD: classifies each frame as speech/music/silence
├── Energy monitoring: tracks audio levels for quality assessment
└── Segment boundary detection: marks silence gaps > 2 seconds

PROCESSING PHASE (server-side, 3-5 minutes):
├── Step 1: Source separation (Demucs, GPU)
│   ├── Input: single mixed audio file
│   └── Output: speech stream + instrument stream
│
├── Step 2: Speech processing (parallel)
│   ├── Whisper transcription → timestamped text
│   └── NLP entity extraction → piece names, musical terms
│
├── Step 3: Instrument analysis (parallel)
│   ├── Pitch detection (pYIN) → continuous pitch curve
│   ├── Chroma extraction (STFT → 12-dim vectors per 100ms)
│   ├── Onset detection (spectral flux + neural refinement)
│   └── Beat/tempo tracking (madmom RNNBeatProcessor)
│
├── Step 4: Segmentation
│   ├── Use VAD map + silence detection to chop into segments
│   └── Classify segments as speech, music, or silence
│
├── Step 5: Score alignment (per music segment)
│   ├── Retrieve reference score (MusicXML/MIDI) from database
│   ├── Convert reference to chroma features
│   ├── DTW alignment: student chroma ↔ reference chroma
│   ├── Output: timestamp → measure/beat mapping
│   ├── Confidence scoring (DTW distance / path length)
│   └── Repetition detection (multiple segments → same measures)
│
├── Step 6: Intonation analysis
│   ├── Compare detected pitch to expected pitch (from alignment)
│   ├── Compute deviation in cents per note
│   └── Pattern detection: group by position, note, direction
│
├── Step 7: Behavior classification
│   ├── Full run-through (single pass, covers most of piece)
│   ├── Spot practice (isolated passage, multiple repetitions)
│   ├── Tempo building (same passage, increasing BPM)
│   ├── Drilling (same passage, stable BPM, many reps)
│   └── Attempted and abandoned (started, stopped early)
│
├── Step 8: Timeline merge
│   ├── Interleave speech transcript with music analysis
│   └── Produce unified chronological lesson JSON
│
└── Step 9: Narrative generation (LLM API call)
    ├── Input: structured lesson JSON + previous lesson data
    ├── Output 1: Teacher summary (specific, technical, concise)
    ├── Output 2: Parent summary (warm, encouraging, actionable)
    └── Output 3: Suggested practice assignments

CODEX INGESTION (async, after lesson delivery):
├── Step 10: Entity extraction for graph
│   ├── Piece transitions (new piece started? old piece completed?)
│   ├── Technique associations (which techniques were exercised)
│   ├── Instructional content extraction from speech
│   └── Effectiveness signals (within-lesson improvement deltas)
│
└── Step 11: Graph updates (batched)
    ├── Upsert piece nodes with updated metrics
    ├── Strengthen/create repertoire transition edges
    ├── Update technique association weights
    ├── Queue instructions for clustering pipeline
    └── Update effectiveness scores
```

---

## Appendix B: Confidence and Graceful Degradation Model

The system computes confidence scores at every analysis stage. Low confidence triggers graceful degradation rather than incorrect output.

| Analysis | High Confidence | Low Confidence Fallback |
|---|---|---|
| Source separation | Clean speech + instrument streams | Process combined audio; speech-only where instruments dominate |
| Speech transcription | Full timestamped transcript | Partial transcript with gaps noted |
| Piece identification | Specific piece + edition matched | "Possible: Vivaldi A minor?" or "Piece not identified" |
| Score alignment | Measure-level mapping | "Approximately measures 45-62" or section-level only |
| Tempo tracking | Precise BPM per section per repetition | Approximate BPM range |
| Intonation analysis | Cent deviation per note, pattern detection | "Intonation data limited due to audio quality" |
| Teacher vs student detection | Confident attribution | "Played at ♩=120 — teacher demo?" [confirm/deny] |

**Core principle:** Never present uncertain analysis as fact. Teacher trust is the product's most valuable asset.

---

## Appendix C: Parent Communication Tone Guidelines

### Words to Never Use in Parent Summaries
struggled, failed, couldn't, wrong, mistake, problem, weak, poor, bad, behind, slow (in the context of learning pace)

### Preferred Reframing
| Instead of... | Use... |
|---|---|
| "Sofia struggled with the passage" | "We spent time developing a challenging passage" |
| "She couldn't maintain tempo" | "She's building up speed gradually — great approach" |
| "Wrong notes in the development" | "The development section is coming together" |
| "Her intonation was poor" | "We're refining her ear for pitch in higher positions" |
| "She failed to complete the run-through" | "She's working toward a full run-through" |
| "She's behind where she should be" | "She's building a strong foundation" |

### Structure of Every Parent Message
1. Open with something genuinely positive and specific
2. Describe what was worked on (process, not evaluation)
3. Give one concrete, actionable thing the parent can encourage at home
4. End with recommended daily practice duration

---

## Appendix D: Data Privacy Architecture

### Data Lifecycle

```
Audio recorded → Uploaded to server → Processed (3-5 min)
    → Structured data extracted → Audio DELETED
    → Only structured JSON + text summaries persist
```

Default: process-and-delete. No audio recordings stored.
Optional: audio retention with encrypted storage and consent.

### Consent Flow for Minors

1. Teacher records first lesson with a minor
2. App prompts: "Before recording lessons with [student], we need parent consent"
3. Parent receives simple message explaining data handling
4. Parent taps "I consent" or "Learn more"
5. If no consent: teacher can use manual mode (no audio processing)
6. Consent is recorded and auditable

### Compliance Standards

Designed for the strictest applicable standard:
- COPPA (US, under-13)
- FERPA (US, educational records)
- GDPR (EU, explicit consent, right to deletion, data minimization)
- PIPL (China, data localization may apply)

### Data Ownership

- Teachers own their lesson data
- Students/parents own their progress data
- Full export available at any time (PDF + CSV + JSON)
- Data is never held hostage to prevent churn
- Aggregated, anonymized data may be used for platform-wide insights (with consent)

---

## Appendix E: The Codex — Technical Architecture

### Three-Layer Graph Schema

```
LAYER 1: REPERTOIRE SEQUENCING GRAPH
Storage: PostgreSQL with graph query extensions (or Neo4j)

Nodes (pieces):
├── piece_id (unique)
├── title, composer, movement
├── instrument(s)
├── tradition/genre
├── difficulty_dimensions: {technical, musical, rhythmic, reading}
├── required_techniques: [list]
├── emotional_character: [tags]
├── estimated_duration
├── available_editions: [list]
├── public_domain: boolean
├── avg_weeks_to_learn: float (computed from lesson data)
└── total_teachers_who_teach_this: int

Edges (transitions):
├── from_piece_id → to_piece_id
├── weight (number of teachers who made this transition)
├── avg_student_level_at_transition
├── avg_gap_between_pieces (weeks)
└── outcome_signal (did students succeed with the next piece?)

LAYER 2: TECHNIQUE DEPENDENCY GRAPH

Technique nodes:
├── technique_id
├── name (e.g., "string crossings at ♩=80+")
├── instrument
├── category (bowing, left hand, rhythm, musicality, etc.)
├── difficulty_level (estimated from student data)
└── description

Piece→Technique edges:
├── piece_id → technique_id
├── relevance_weight (how central is this technique to this piece)
├── typical_measures (where in the piece this technique appears)
└── evidence_count (how many lessons inform this connection)

Technique→Technique prerequisite edges:
├── prerequisite_technique_id → advanced_technique_id
├── strength (how strongly the prerequisite predicts success)
└── evidence_count

LAYER 3: PEDAGOGICAL INSTRUCTION GRAPH

Instruction clusters:
├── cluster_id
├── canonical_label (e.g., "Bow mechanics — relaxed arm")
├── representative_instructions: [list of example phrasings]
├── piece_id + measure_range (where this instruction applies)
├── technique_id (which technique it addresses)
├── frequency (% of teachers who use this approach)
├── avg_within_lesson_improvement: float
├── avg_between_lesson_improvement: float
└── student_profile_effectiveness: {
        beginners: float,
        intermediate: float,
        advanced: float
    }
```

### Data Ingestion Pipeline

```
EVERY PROCESSED LESSON:
    ↓
ENTITY EXTRACTION:
├── Piece identification (from speech NLP + score alignment)
├── Technique tagging:
│   ├── From audio analysis: which techniques were exercised
│   │   (e.g., string crossings detected from bowing patterns,
│   │    shifting detected from position changes)
│   └── From speech: teacher mentions technique names
│       ("let's work on your spiccato")
├── Instruction extraction:
│   ├── Filter speech transcript for instructional content
│   │   (exclude greetings, scheduling, small talk)
│   └── Tag each instruction with timestamp + context
├── Repertoire transition detection:
│   ├── Compare current lesson pieces to previous lessons
│   └── If new piece appears and old piece is "complete,"
│       record transition edge
└── Effectiveness signals:
    ├── Within-lesson: compare attempt N+1 to attempt N
    │   after each instruction
    └── Between-lesson: compare week N+1 to week N
        for specific sections/techniques
    ↓
GRAPH UPDATES (batched, async):
├── Upsert piece nodes with updated aggregate metrics
├── Strengthen/create transition edges
├── Update technique associations
├── Add instructions to clustering queue
└── Update effectiveness scores
```

### Instruction Clustering Pipeline (Batch Process)

```
RUN PERIODICALLY (weekly or when sufficient new data):

1. COLLECT: Gather all new instructions tagged to the same 
   piece + measure range since last clustering run

2. EMBED: Pass each instruction through a sentence transformer
   model (e.g., all-MiniLM-L6-v2, open source, fast)
   → Each instruction becomes a 384-dimensional vector

3. CLUSTER: Run HDBSCAN on the embedding space
   → Automatically determines number of clusters
   → Handles noise/outliers (instructions that don't fit 
     any cluster are set aside)
   
4. LABEL: For each cluster, select the most central 
   instruction (closest to centroid) as the canonical label
   → Optionally use LLM to generate a cleaner label from 
     the top-5 representative instructions

5. COMPUTE EFFECTIVENESS: For each cluster, aggregate the 
   effectiveness signals from all lessons that used 
   instructions in this cluster
   → Within-lesson improvement: avg tempo/intonation delta 
     after instruction
   → Between-lesson improvement: avg progress rate for 
     students whose teachers used this approach

6. STORE: Update cluster nodes in the graph with new 
   membership, labels, and effectiveness scores
```

### Effectiveness Measurement — Statistical Rigor

```
WITHIN-LESSON SIGNAL:
├── Metric: improvement from attempt N to attempt N+1
│   after a specific instruction
├── Measured by: tempo delta, intonation delta, 
│   completion percentage (did they get further?)
├── Confound: student might have improved regardless
├── Control: compare to average within-lesson improvement 
│   across all instructions for the same passage
├── Minimum sample: 30+ lessons before reporting

BETWEEN-LESSON SIGNAL:
├── Metric: week-over-week improvement rate on a section
│   compared to platform average for that section
├── Measured by: tempo progression slope, intonation trend
├── Confound: practice habits, student aptitude, 
│   other teacher interventions
├── Control: compare teachers using approach A vs approach B
│   on the same passage with similar student profiles
├── Minimum sample: 100+ student-passage pairs before 
│   reporting effectiveness with confidence

COMBINED CONFIDENCE SCORE:
├── Low confidence: < 30 data points, show frequency only
│   ("62% of teachers use this approach")
├── Medium confidence: 30-100 data points, show trend
│   ("students using this approach tend to improve faster")
├── High confidence: 100+ data points, show specific metrics
│   ("22% faster tempo improvement on average, p < 0.05")
```

### Privacy and Aggregation

All Codex data is aggregated and anonymized:
- Individual teacher instructions are clustered, never exposed verbatim to other teachers
- Student data is aggregated into statistical patterns, never individually identifiable
- Effectiveness metrics are computed across populations, never attributed to specific students
- Teachers can opt out of having their lesson data contribute to The Codex
- Institutional data is only shared in aggregate form with consent

---

*This blueprint represents the full product vision. The MVP (Section 16) is the starting point — everything else is built incrementally based on validated learning from real teachers.*
