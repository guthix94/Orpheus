"""End-to-end test: create student -> start lesson -> stop lesson -> verify.

Usage:
    python scripts/test_api_flow.py [BASE_URL]

BASE_URL defaults to http://localhost:8000.
Requires the backend running with DEV_MODE=true (no auth token needed).
"""

import io
import json
import sys
import time
import urllib.request
import urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
INFO = "\033[94m----\033[0m"


def req(method: str, path: str, body: dict | None = None) -> dict:
    """Send a JSON request and return parsed response."""
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())


def upload(path: str, file_bytes: bytes, filename: str) -> dict:
    """Upload a file via multipart/form-data and return parsed response."""
    boundary = "----OrpheusTestBoundary"
    body = io.BytesIO()
    body.write(f"--{boundary}\r\n".encode())
    body.write(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    body.write(b"Content-Type: application/octet-stream\r\n\r\n")
    body.write(file_bytes)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    data = body.getvalue()

    r = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())


def main() -> None:
    passed = 0
    failed = 0

    def check(label: str, condition: bool, detail: str = ""):
        nonlocal passed, failed
        if condition:
            print(f"  {PASS}  {label}")
            passed += 1
        else:
            print(f"  {FAIL}  {label}  {detail}")
            failed += 1

    # ---- Health check ----
    print(f"\n{INFO} Health check")
    try:
        health = req("GET", "/health")
        check("GET /health returns ok", health.get("status") == "ok")
    except Exception as e:
        print(f"  {FAIL}  Cannot reach backend at {BASE}: {e}")
        print(f"\n  Make sure the backend is running:\n")
        print(f"    cd /path/to/Orpheus && uvicorn server.main:app --reload\n")
        sys.exit(1)

    # ---- Step 1: Create student ----
    print(f"\n{INFO} Step 1: Create student")
    student = req("POST", "/api/students", {
        "name": "Test Student",
        "instrument": "violin",
        "parent_email": "parent@example.com",
    })
    student_id = student["id"]
    check("POST /api/students returns 'id'", bool(student_id))
    check("name matches", student["name"] == "Test Student")
    check("instrument matches", student["instrument"] == "violin")
    check("parent_email matches", student["parent_email"] == "parent@example.com")
    print(f"         student_id = {student_id}")

    # ---- Step 2: Verify student appears in list ----
    print(f"\n{INFO} Step 2: Verify student in list")
    students = req("GET", "/api/students")
    found = any(s["id"] == student_id for s in students)
    check("GET /api/students contains new student", found)

    # ---- Step 3: Get student by ID ----
    print(f"\n{INFO} Step 3: Get student by ID")
    fetched = req("GET", f"/api/students/{student_id}")
    check("GET /api/students/{id} returns correct student", fetched["id"] == student_id)

    # ---- Step 4: Update student ----
    print(f"\n{INFO} Step 4: Update student")
    updated = req("PATCH", f"/api/students/{student_id}", {
        "notes": "Great intonation, needs work on bowing",
    })
    check("PATCH /api/students/{id} returns updated notes", updated["notes"] == "Great intonation, needs work on bowing")

    # ---- Step 5: Start lesson ----
    print(f"\n{INFO} Step 5: Start lesson")
    lesson = req("POST", "/api/lessons", {
        "student_id": student_id,
    })
    lesson_id = lesson["id"]
    check("POST /api/lessons returns 'id'", bool(lesson_id))
    check("status is 'recording'", lesson["status"] == "recording")
    check("student_id matches", lesson["student_id"] == student_id)
    print(f"         lesson_id  = {lesson_id}")

    # ---- Step 6: Simulate a short recording pause ----
    print(f"\n{INFO} Step 6: Simulate 2-second recording...")
    time.sleep(2)

    # ---- Step 7: Stop lesson ----
    print(f"\n{INFO} Step 7: Stop lesson")
    stopped = req("POST", f"/api/lessons/{lesson_id}/stop", {})
    check("status changed to 'processing'", stopped["status"] == "processing")
    check("ended_at is set", stopped["ended_at"] is not None)
    check("duration_seconds >= 2", (stopped["duration_seconds"] or 0) >= 2)

    # ---- Step 8: Upload audio ----
    print(f"\n{INFO} Step 8: Upload audio file")
    # Create a minimal valid WAV file (44-byte header + silence)
    wav_header = (
        b"RIFF" + (36).to_bytes(4, "little") + b"WAVE"
        + b"fmt " + (16).to_bytes(4, "little")
        + (1).to_bytes(2, "little")     # PCM
        + (1).to_bytes(2, "little")     # mono
        + (16000).to_bytes(4, "little") # sample rate
        + (32000).to_bytes(4, "little") # byte rate
        + (2).to_bytes(2, "little")     # block align
        + (16).to_bytes(2, "little")    # bits per sample
        + b"data" + (0).to_bytes(4, "little")
    )
    uploaded = upload(
        f"/api/lessons/{lesson_id}/upload-audio",
        wav_header,
        f"{lesson_id}.wav",
    )
    check("upload returns lesson with audio_file_path set", uploaded["audio_file_path"] is not None)
    check("audio_file_path contains lesson id", lesson_id in (uploaded["audio_file_path"] or ""))

    # ---- Step 9: Verify lesson persisted ----
    print(f"\n{INFO} Step 9: Verify lesson persisted (GET)")
    persisted = req("GET", f"/api/lessons/{lesson_id}")
    check("GET /api/lessons/{id} returns correct lesson", persisted["id"] == lesson_id)
    check("status is 'processing'", persisted["status"] == "processing")
    check("student_id correct", persisted["student_id"] == student_id)

    # ---- Step 10: List lessons for student ----
    print(f"\n{INFO} Step 10: List lessons filtered by student")
    lessons = req("GET", f"/api/lessons?student_id={student_id}")
    found = any(l["id"] == lesson_id for l in lessons)
    check("GET /api/lessons?student_id= contains the lesson", found)

    # ---- Step 11: Send parent message ----
    print(f"\n{INFO} Step 11: Send parent message")
    msg = req("POST", "/api/parents/messages", {
        "lesson_id": lesson_id,
        "student_id": student_id,
        "message_body": "Great progress today! Keep practicing measures 12-24.",
        "message_type": "lesson_summary",
        "channel": "email",
        "recipient": "parent@example.com",
    })
    msg_id = msg["id"]
    check("POST /api/parents/messages returns 'id'", bool(msg_id))
    check("delivery_status is 'sent'", msg["delivery_status"] == "sent")
    check("message_body matches", "Great progress" in msg["message_body"])

    # ---- Step 12: Verify communication log ----
    print(f"\n{INFO} Step 12: Verify communication log")
    log = req("GET", f"/api/parents/messages/{student_id}")
    found = any(m["id"] == msg_id for m in log)
    check("GET /api/parents/messages/{student_id} contains the message", found)

    # ---- Step 13: Double-stop should fail (409) ----
    print(f"\n{INFO} Step 13: Double-stop returns 409")
    try:
        req("POST", f"/api/lessons/{lesson_id}/stop", {})
        check("double-stop rejected with 409", False, "(no error raised)")
    except urllib.error.HTTPError as e:
        check("double-stop rejected with 409", e.code == 409, f"(got {e.code})")

    # ---- Summary ----
    total = passed + failed
    print(f"\n{'=' * 50}")
    print(f"  {passed}/{total} checks passed", end="")
    if failed:
        print(f"  ({failed} failed)")
    else:
        print(f"  — all green!")
    print(f"{'=' * 50}\n")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
