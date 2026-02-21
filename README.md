# Orpheus

Intelligent lesson documentation system for music educators.

A music teacher taps "record" at the start of a lesson, teaches normally, taps "stop" at the end, and receives an auto-generated structured summary — what pieces were worked on, which sections, at what tempo, how many repetitions, week-over-week progress, plus a parent-friendly message they can send with one tap.

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Install Python dependencies
pip install -e ".[dev]"

# Start API server
uvicorn server.main:app --reload

# Start frontend
cd frontend && npm install && npm run dev
```

See `CLAUDE.md` for full architecture details and `docs/orpheus-blueprint.md` for the complete product blueprint.
