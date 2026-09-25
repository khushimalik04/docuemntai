# Build contract (source of truth for backend, frontend and seed data)

All three parts are built in parallel against this document. If something here is ambiguous, pick the
simplest reading and note it in your final report. Do not change shapes without saying so.

## Conventions
- Backend base URL: `http://localhost:8000`, every route under `/api`.
- Frontend reads `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
- Times: `start_sec` / `end_sec` / `duration_sec` are numbers in **seconds** (float allowed for segments).
- Dates: ISO 8601 strings (`2026-09-18T10:30:00`). No timezone handling beyond that; treat as local.
- Errors: FastAPI default `{"detail": "..."}` with 404 / 422 / 400.
- IDs are integers.
- There is no auth. A single default user "Demo User" is assumed.

## JSON shapes (TypeScript notation)
```ts
type Participant = { id: number; name: string; email: string | null };

type Summary = {
  overview: string;            // 1-3 paragraphs, plain text, paragraphs separated by "\n\n"
  keywords: string[];          // 4-10 short keywords
  generated_by: "seed" | "llm" | "heuristic";
};

type Chapter = { id: number; title: string; start_sec: number };

type ActionItem = {
  id: number;
  meeting_id: number;
  text: string;
  completed: boolean;
  assignee: Participant | null;
  segment_id: number | null;   // transcript segment it came from, if any
  start_sec: number | null;    // that segment's start, for "jump to" links
  created_at: string;
};

type Segment = {
  id: number;
  idx: number;                 // 0-based order in the transcript
  speaker_label: string;       // display name, always present
  speaker_participant_id: number | null;
  start_sec: number;
  end_sec: number;
  text: string;
};

type MeetingListItem = {
  id: number;
  title: string;
  date: string;
  duration_sec: number;
  source: "seed" | "upload" | "form";
  participants: Participant[];
  summary_snippet: string | null;  // first ~160 chars of summary overview
  open_action_items: number;       // count of not-completed action items
};

type MeetingDetail = Omit<MeetingListItem, "summary_snippet" | "open_action_items"> & {
  summary: Summary | null;
  chapters: Chapter[];             // sorted by start_sec
  action_items: ActionItem[];      // sorted by id
};

type SearchHit = {
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  segment_id: number;
  start_sec: number;
  speaker_label: string;
  text: string;
};
```

## Endpoints
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/api/health` | | `{"status":"ok"}` |
| GET | `/api/meetings` | query: `q` (title contains, case-insensitive), `participant_id`, `date_from` (YYYY-MM-DD, inclusive), `date_to` (inclusive), `sort` = `recent` (default) \| `oldest` | `MeetingListItem[]` |
| GET | `/api/participants` | | `Participant[]` sorted by name |
| POST | `/api/meetings` | JSON `{ title: string, date?: string, participants?: string[] (names), transcript_text: string }` | `MeetingDetail`, 201 |
| POST | `/api/meetings/upload` | multipart: `file` (.txt/.vtt/.json), optional `title`, `date`, `participants` (comma-separated names) | `MeetingDetail`, 201 |
| GET | `/api/meetings/{id}` | | `MeetingDetail` |
| PATCH | `/api/meetings/{id}` | JSON `{ title?: string, participants?: string[] (names, replaces the list) }` | `MeetingDetail` |
| DELETE | `/api/meetings/{id}` | | 204 |
| GET | `/api/meetings/{id}/transcript` | | `Segment[]` sorted by idx |
| POST | `/api/meetings/{id}/summarize` | | `MeetingDetail` (summary + chapters regenerated; extracted action items added only if the meeting has none) |
| POST | `/api/meetings/{id}/action-items` | JSON `{ text: string, assignee_name?: string \| null }` | `ActionItem`, 201 |
| PATCH | `/api/action-items/{id}` | JSON `{ text?: string, completed?: boolean, assignee_name?: string \| null }` | `ActionItem` |
| DELETE | `/api/action-items/{id}` | | 204 |
| GET | `/api/search` | query `q` (min 2 chars) | `SearchHit[]` (max 50, newest meeting first) |

Create/upload behaviour: parse the transcript into segments, create participants from speakers (plus any
names passed in), set `duration_sec` = last segment `end_sec`, then run the summarizer (LLM if a key is set,
else heuristic) so the new meeting immediately has a summary, chapters and action items.
If no title is given for an upload, use the file name without extension.

## Transcript input formats (create + upload)
1. **Plain text** (`.txt` and the paste box). One utterance per line:
   - `[00:01:23] Speaker Name: text` or `[01:23] Speaker Name: text` or `00:01:23 Speaker Name: text`
   - `Speaker Name: text` with no timestamp. Then synthesize times at ~150 words/min, back to back.
   - Lines without a `Name:` prefix are appended to the previous speaker's segment.
   - `end_sec` of a segment = next segment's `start_sec` (last one: start + estimated speech time).
2. **WebVTT** (`.vtt`): standard cues. Speaker from `<v Name>text</v>` or `Name: text`, else "Speaker 1".
3. **JSON** (`.json`): either `[{speaker, start, end?, text}]` or `{"segments": [...]}`; same fields.

## Seed data file format (`backend/app/seed/data/*.json`, one meeting per file)
```json
{
  "title": "Q4 Roadmap Planning",
  "date": "2026-09-18T10:30:00",
  "participants": [{ "name": "Priya Sharma", "email": "priya@acme.io" }],
  "segments": [{ "speaker": "Priya Sharma", "start": 0.0, "end": 14.2, "text": "..." }],
  "summary": { "overview": "...", "keywords": ["roadmap", "..."] },
  "chapters": [{ "title": "Kickoff and agenda", "start": 0.0 }],
  "action_items": [{ "text": "...", "assignee": "Priya Sharma", "start": 312.5, "completed": false }]
}
```
- Every `speaker` and `assignee` must exactly match a `participants[].name` in the same file.
- `action_items[].start` must equal the `start` of an existing segment (the loader links it by that value).
- Segments are sorted, non-overlapping; the last `end` is the meeting duration.
- The same participant (same name + email) may appear across several meetings. That's good, the filter uses it.

## Database (SQLite via SQLAlchemy 2.0)
- `meetings`(id, title, date, duration_sec, source, created_at)
- `participants`(id, name, email UNIQUE NULL)
- `meeting_participants`(meeting_id FK, participant_id FK, PK both)
- `transcript_segments`(id, meeting_id FK, idx, speaker_label, speaker_participant_id FK NULL, start_sec, end_sec, text); index (meeting_id, idx)
- `summaries`(meeting_id PK+FK, overview, keywords JSON text, generated_by)
- `chapters`(id, meeting_id FK, title, start_sec)
- `action_items`(id, meeting_id FK, text, completed, assignee_participant_id FK NULL, segment_id FK NULL, created_at)
- Deleting a meeting cascades to segments, summary, chapters, action items, and join rows (not participants).
- Participant de-dup: match by email if given, else by exact name.
- On startup: create tables; if `meetings` is empty, load every seed file.

## Env vars
- Backend: `DATABASE_URL` (default `sqlite:///./fireflies.db`), `CORS_ORIGINS` (comma list, default
  `http://localhost:3000`), `ANTHROPIC_API_KEY` (optional), `LLM_MODEL` (default `claude-haiku-4-5-20251001`).
- Frontend: `NEXT_PUBLIC_API_URL`.
