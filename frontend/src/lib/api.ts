import type {
  ActionItem,
  CreateActionItemPayload,
  CreateMeetingPayload,
  MeetingDetail,
  MeetingFiltersQuery,
  MeetingListItem,
  Participant,
  SearchHit,
  Segment,
  UpdateActionItemPayload,
  UpdateMeetingPayload,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Thin fetch wrapper: builds the full URL, parses JSON, and throws an
 * Error using the FastAPI `{"detail": "..."}` message on non-2xx responses.
 */
async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      "Could not reach the server. Is the backend running on " + API_URL + "?"
    );
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? (data as { detail?: string }).detail
        : null) ?? `Request failed (${res.status})`;
    throw new Error(detail);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getHealth(): Promise<{ status: string }> {
  return request("/api/health");
}

export function listMeetings(
  filters: MeetingFiltersQuery = {}
): Promise<MeetingListItem[]> {
  const qs = buildQuery({
    q: filters.q,
    participant_id: filters.participant_id,
    date_from: filters.date_from,
    date_to: filters.date_to,
    sort: filters.sort,
  });
  return request(`/api/meetings${qs}`);
}

export function listParticipants(): Promise<Participant[]> {
  return request("/api/participants");
}

export function createMeeting(
  payload: CreateMeetingPayload
): Promise<MeetingDetail> {
  return request("/api/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadMeeting(form: FormData): Promise<MeetingDetail> {
  return request("/api/meetings/upload", {
    method: "POST",
    body: form,
  });
}

export function getMeeting(id: number): Promise<MeetingDetail> {
  return request(`/api/meetings/${id}`);
}

export function updateMeeting(
  id: number,
  payload: UpdateMeetingPayload
): Promise<MeetingDetail> {
  return request(`/api/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMeeting(id: number): Promise<void> {
  return request(`/api/meetings/${id}`, { method: "DELETE" });
}

export function getTranscript(id: number): Promise<Segment[]> {
  return request(`/api/meetings/${id}/transcript`);
}

export function summarizeMeeting(id: number): Promise<MeetingDetail> {
  return request(`/api/meetings/${id}/summarize`, { method: "POST" });
}

export function createActionItem(
  meetingId: number,
  payload: CreateActionItemPayload
): Promise<ActionItem> {
  return request(`/api/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateActionItem(
  id: number,
  payload: UpdateActionItemPayload
): Promise<ActionItem> {
  return request(`/api/action-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActionItem(id: number): Promise<void> {
  return request(`/api/action-items/${id}`, { method: "DELETE" });
}

export function search(q: string): Promise<SearchHit[]> {
  return request(`/api/search${buildQuery({ q })}`);
}
