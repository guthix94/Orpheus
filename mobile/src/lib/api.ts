/**
 * API client for the Orpheus backend.
 *
 * Mirrors the web client's auth header pattern:
 *   Authorization: Bearer <supabase_access_token>
 *
 * All endpoints are prefixed with /api on the server.
 */

import { supabase } from "./supabase";
import { ENV } from "./env";

const API_BASE = ENV.API_URL;

// ── Types ───────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  teacher_id: string;
  name: string;
  instrument: string;
  created_at: string;
  current_pieces: string[] | null;
  estimated_level: string | null;
  notes: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  parent_portal_token: string | null;
}

export interface Clip {
  index: number;
  start: number;
  end: number;
  duration: number;
  types: string[];
  url: string;
  label?: string;
  shared_with_parent?: boolean;
}

export interface Assignment {
  id?: string;
  description: string;
  details?: string | null;
}

export interface Lesson {
  id: string;
  student_id: string;
  teacher_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  audio_file_path: string | null;
  status: string;
  summary_style: string;
  pieces_detected: string[] | null;
  teacher_summary: string | null;
  teacher_summary_formal: string | null;
  parent_summary: string | null;
  suggested_assignments: Assignment[] | null;
  processing_metadata: Record<string, unknown> | null;
  timeline_json: Record<string, unknown> | null;
  clips: Clip[] | null;
  confirmed_at: string | null;
  is_locked: boolean;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function uploadFile<T>(
  path: string,
  fileUri: string,
  filename: string,
  mimeType: string
): Promise<T> {
  const auth = await getAuthHeaders();
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...auth },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Profile ─────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  return api<Profile>("/api/me");
}

export async function updateDisplayName(
  displayName: string
): Promise<Profile> {
  return api<Profile>("/api/me/display-name", {
    method: "PUT",
    body: JSON.stringify({ display_name: displayName }),
  });
}

// ── Students ────────────────────────────────────────────────────────────

export async function listStudents(): Promise<Student[]> {
  return api<Student[]>("/api/students");
}

export async function getStudent(studentId: string): Promise<Student> {
  return api<Student>(`/api/students/${studentId}`);
}

export async function createStudent(data: {
  name: string;
  instrument: string;
  parent_email?: string | null;
  parent_phone?: string | null;
  notes?: string | null;
}): Promise<Student> {
  return api<Student>("/api/students", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generatePortalToken(
  studentId: string
): Promise<{ parent_portal_token: string }> {
  return api<{ parent_portal_token: string }>(
    `/api/students/${studentId}/portal-token`,
    { method: "POST" }
  );
}

// ── Lessons ─────────────────────────────────────────────────────────────

/**
 * List lessons, optionally filtered by student and/or status.
 * Results are ordered by started_at descending (most recent first).
 */
export async function listLessons(params?: {
  studentId?: string;
  status?: string;
}): Promise<Lesson[]> {
  const searchParams = new URLSearchParams();
  if (params?.studentId) searchParams.set("student_id", params.studentId);
  if (params?.status) searchParams.set("lesson_status", params.status);
  const qs = searchParams.toString();
  return api<Lesson[]>(`/api/lessons${qs ? `?${qs}` : ""}`);
}

/**
 * Get a single lesson by ID (for polling status or viewing summary).
 */
export async function getLesson(lessonId: string): Promise<Lesson> {
  return api<Lesson>(`/api/lessons/${lessonId}`);
}

/**
 * Get a student's most recent completed lesson.
 * Uses the list endpoint with status filter, returns the first result.
 */
export async function getLatestCompletedLesson(
  studentId: string
): Promise<Lesson | null> {
  const lessons = await listLessons({
    studentId,
    status: "completed",
  });
  return lessons.length > 0 ? lessons[0] : null;
}

/**
 * Create a new lesson record (step 1 of the recording flow).
 * Sets status to "recording".
 */
export async function startLesson(
  studentId: string,
  summaryStyle: string = "standard"
): Promise<Lesson> {
  return api<Lesson>("/api/lessons", {
    method: "POST",
    body: JSON.stringify({
      student_id: studentId,
      summary_style: summaryStyle,
    }),
  });
}

/**
 * Stop a lesson (step 2 — sets status to "processing").
 * Sends client-measured duration so the server doesn't have to rely solely
 * on server-side timestamp arithmetic (which can produce 0 for short lessons).
 */
export async function stopLesson(
  lessonId: string,
  durationSeconds?: number
): Promise<Lesson> {
  return api<Lesson>(`/api/lessons/${lessonId}/stop`, {
    method: "POST",
    body: JSON.stringify({
      duration_seconds: durationSeconds ?? null,
    }),
  });
}

/**
 * Upload audio for a lesson (step 3 — triggers processing pipeline).
 * The backend expects a multipart form with field name "file".
 */
export async function uploadLessonAudio(
  lessonId: string,
  fileUri: string,
  filename: string,
  mimeType: string = "audio/m4a"
): Promise<Lesson> {
  return uploadFile<Lesson>(
    `/api/lessons/${lessonId}/upload-audio`,
    fileUri,
    filename,
    mimeType
  );
}

/**
 * Update a lesson's editable fields (teacher_summary, parent_summary, etc.).
 */
export async function updateLesson(
  lessonId: string,
  data: { teacher_summary?: string; parent_summary?: string }
): Promise<Lesson> {
  return api<Lesson>(`/api/lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Toggle clip sharing status with parent.
 */
export async function toggleClipShare(
  lessonId: string,
  clipIndex: number
): Promise<Lesson> {
  return api<Lesson>(`/api/lessons/${lessonId}/clips/${clipIndex}/share`, {
    method: "PATCH",
  });
}
