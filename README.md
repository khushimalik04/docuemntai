# Fireflies Clone

A meeting notes and transcript app: upload or paste a transcript and get an automatic summary,
chapters, action items, and a searchable, time-synced transcript. Built for the Scaler SDE
fullstack assignment. Single user, no auth, no real audio/video.

Live demo: TODO (add the Vercel URL after deploying)
Repository: TODO (add the GitHub URL)

## Features

- [x] Meeting list with search by title, filter by participant and date range, sort by recent/oldest
- [x] Create a meeting by pasting a transcript, or uploading a `.txt` / `.vtt` / `.json` file
- [x] Automatic summary (overview + keywords), chapters, and extracted action items on create/upload
- [x] Meeting detail page: overview, outline (chapters), transcript, action items tabs
- [x] Transcript view synced to a simulated player: click a line to seek, active line auto-highlights
      and auto-scrolls, keyboard-operable (Tab + Enter/Space to jump to a line)
- [x] Deep links to a specific moment (`?t=123` seeks on load)
- [x] Action items: add, edit, toggle complete, delete, jump to the moment they were said
- [x] Edit meeting title and participants, delete a meeting
- [x] Re-run summarization on demand
- [x] Global search across all transcripts
- [x] Export a meeting as Markdown (`.md`) or plain text (`.txt`)
- [x] Participant de-duplication (by email, else by exact name) across meetings

### Placeholders

These exist as UI shells that say "Coming Soon" and do not connect to anything real:

- Live Notetaker (a bot joining live calls)
- Integrations (calendar, Zoom, Google Meet, CRM)
- Team (invites, workspace roles)
- Analytics
- Settings
- Authentication: there is no login. Every request acts as a single default user, "Demo User".

The media player is also a placeholder: there is no real audio or video file. `usePlayer`
simulates a playback clock against the meeting's `duration_sec` so the transcript sync features
have something to sync to.

## Tech stack

- Backend: FastAPI, SQLAlchemy 2.0, SQLite, Pydantic v2, pytest, optional Anthropic API for summaries
- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS, lucide-react icons
- No external services required to run the app. Everything works with the seed data out of the box.

## Architecture

```
Browser  <-- HTTP/JSON -->  Next.js frontend (app router)  <-- HTTP/JSON -->  FastAPI backend  <-->  SQLite
```

The frontend never touches the database directly; every read and write goes through the REST API
described below, via `frontend/src/lib/api.ts`.

### Backend layering

```
routers/        thin HTTP layer: parse request, call a service function, return a schema
  meetings.py    meeting CRUD, upload, transcript, summarize
  action_items.py action item CRUD
  search.py      transcript search
services/        the actual logic, independent of FastAPI
  parsers.py     turn raw txt/vtt/json into a list of segment dicts (pure functions, no DB)
  meeting_service.py  build/update meetings, participant dedup, DTO builders
  summarizer.py  LLM or heuristic summary/chapters/action-item extraction
models.py        SQLAlchemy 2.0 typed models
schemas.py       Pydantic request/response models, matching docs/CONTRACT.md
seed/            seed data (JSON) and the loader that runs on first startup
```

Routers stay thin on purpose: they validate input, call one service function, and shape the
response. All the actual behavior (parsing a transcript, deciding how to summarize it, deduping
a participant) lives in `services/`, so it can be tested and reused without spinning up HTTP.

### Frontend structure

```
app/                 route segments (Next.js App Router)
  page.tsx             home/dashboard
  meetings/            meeting list, meeting detail ([id])
  search/              global search
  live-notetaker/, integrations/, team/, analytics/, settings/   "Coming Soon" placeholders
components/
  layout/    AppShell, Sidebar, Topbar - the app chrome
  meetings/  list page pieces: filters, row, new/edit/delete modals
  meeting/   detail page pieces: tabs, transcript, transcript line, media player, export menu
  ui/        generic building blocks: Button, Modal, Dropdown, Avatar, Tabs, Skeleton, ComingSoon
lib/
  api.ts     one function per backend endpoint, thin fetch wrapper
  types.ts   TypeScript types mirroring docs/CONTRACT.md
  format.ts  date/time formatting helpers
hooks/
  usePlayer.ts   the simulated playback clock (see below)
```

### Transcript/player sync

There is no real media file, so `usePlayer` (`frontend/src/hooks/usePlayer.ts`) simulates one:

- It owns `currentTime`, a number of seconds into the meeting.
- While playing, a `setInterval` fires every 250ms. Each tick measures the *real* elapsed time
  since the previous tick (`performance.now()` delta, scaled by playback speed) rather than
  assuming exactly 250ms, because timers drift and browsers throttle background tabs.
- `Transcript` (`frontend/src/components/meeting/Transcript.tsx`) derives the active line from
  `currentTime`: it is the *last* segment whose `start_sec <= currentTime`. This means a line
  stays active until the next one's start time is reached, even if there are small gaps between
  segments.
- Clicking a transcript line calls `seek(segment.start_sec)`, which snaps `currentTime` straight
  there (clamped to `[0, duration_sec]`). Action item timestamps and outline chapters use the same
  `seek`.
- The active line auto-scrolls into view (`scrollIntoView({ block: "center" })`) whenever it
  changes, **unless** the user scrolled the transcript container by hand (wheel or touch) in the
  last 4 seconds. This stops the view from fighting a user who is manually reading up or down.
- `MeetingDetailClient` reads a `?t=` query param on load and calls `seek` once the meeting (and
  therefore its `duration_sec`) has loaded, so links like `/meetings/12?t=185` open the page
  already scrolled to and highlighting the right line.

## Database schema

SQLite via SQLAlchemy 2.0. Foreign keys are enforced (`PRAGMA foreign_keys=ON` per connection).

### `meetings`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| title | text | |
| date | datetime | |
| duration_sec | float | last segment's `end_sec` |
| source | text | `"seed"` \| `"upload"` \| `"form"` |
| created_at | datetime | |

### `participants`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| name | text | |
| email | text, unique, nullable | |

Participant de-dup: when a participant name (and optional email) is seen, the app matches an
existing row by email if one was given, otherwise by exact name match. This is why the same
person ("Priya Sharma") can show up as a speaker across several seed meetings and still resolve
to one row.

### `meeting_participants`
Join table, composite primary key (`meeting_id`, `participant_id`). Both foreign keys cascade on
delete from the `meetings`/`participants` side that owns them; deleting a meeting removes its rows
here, deleting a participant is not something the app does.

`GET /api/participants` only returns participants who are in at least one meeting
(`Participant.meetings.any()`), so a filter dropdown never lists a name with zero results behind it.

### `transcript_segments`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| meeting_id | integer FK -> meetings.id, ON DELETE CASCADE | |
| idx | integer | 0-based order within the meeting |
| speaker_label | text | display name, always present even if unmatched |
| speaker_participant_id | integer FK -> participants.id, nullable | |
| start_sec | float | |
| end_sec | float | |
| text | text | |

Indexed on (`meeting_id`, `idx`).

### `summaries`
| Column | Type | Notes |
|---|---|---|
| meeting_id | integer PK, FK -> meetings.id, ON DELETE CASCADE | one-to-one with meetings |
| overview | text | 1-3 paragraphs, `\n\n` separated |
| keywords | text | JSON-encoded list of strings |
| generated_by | text | `"seed"` \| `"llm"` \| `"heuristic"` |

### `chapters`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| meeting_id | integer FK -> meetings.id, ON DELETE CASCADE | |
| title | text | |
| start_sec | float | |

### `action_items`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| meeting_id | integer FK -> meetings.id, ON DELETE CASCADE | |
| text | text | |
| completed | boolean | default false |
| assignee_participant_id | integer FK -> participants.id, nullable | |
| segment_id | integer FK -> transcript_segments.id, ON DELETE SET NULL, nullable | |
| created_at | datetime | |

`segment_id` exists so an action item can link back to the exact transcript line it was said in,
which is what powers "jump to the moment" from the action items tab. It uses `ON DELETE SET NULL`
rather than `CASCADE` because deleting the segment it points to (which does not happen in normal
use, but could via a resummarize that regenerates segments in a hypothetical future version)
should not delete the action item itself, only forget which line it was tied to.

Deleting a meeting cascades to its segments, summary, chapters, action items, and
`meeting_participants` rows. It does not delete participants, since they may belong to other
meetings.

### Entity relationship diagram

```mermaid
erDiagram
    MEETINGS ||--o{ TRANSCRIPT_SEGMENTS : has
    MEETINGS ||--o| SUMMARIES : has
    MEETINGS ||--o{ CHAPTERS : has
    MEETINGS ||--o{ ACTION_ITEMS : has
    MEETINGS ||--o{ MEETING_PARTICIPANTS : has
    PARTICIPANTS ||--o{ MEETING_PARTICIPANTS : has
    PARTICIPANTS ||--o{ TRANSCRIPT_SEGMENTS : "speaks (optional)"
    PARTICIPANTS ||--o{ ACTION_ITEMS : "assigned (optional)"
    TRANSCRIPT_SEGMENTS ||--o| ACTION_ITEMS : "said in (optional)"

    MEETINGS {
        int id PK
        string title
        datetime date
        float duration_sec
        string source
        datetime created_at
    }
    PARTICIPANTS {
        int id PK
        string name
        string email UK "nullable"
    }
    MEETING_PARTICIPANTS {
        int meeting_id PK_FK
        int participant_id PK_FK
    }
    TRANSCRIPT_SEGMENTS {
        int id PK
        int meeting_id FK
        int idx
        string speaker_label
        int speaker_participant_id FK "nullable"
        float start_sec
        float end_sec
        string text
    }
    SUMMARIES {
        int meeting_id PK_FK
        string overview
        string keywords
        string generated_by
    }
    CHAPTERS {
        int id PK
        int meeting_id FK
        string title
        float start_sec
    }
    ACTION_ITEMS {
        int id PK
        int meeting_id FK
        string text
        bool completed
        int assignee_participant_id FK "nullable"
        int segment_id FK "nullable, ON DELETE SET NULL"
        datetime created_at
    }
```

## API overview

Base URL: `http://localhost:8000` locally, every route under `/api`. No auth. Errors use FastAPI's
default `{"detail": "..."}` shape with 404/422/400.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/api/health` | | `{"status": "ok"}` |
| GET | `/api/meetings` | query: `q`, `participant_id`, `date_from`, `date_to`, `sort` (`recent` default \| `oldest`) | `MeetingListItem[]` |
| GET | `/api/participants` | | `Participant[]` sorted by name, only participants in at least one meeting |
| POST | `/api/meetings` | `{ title, date?, participants?, transcript_text }` | `MeetingDetail`, 201 |
| POST | `/api/meetings/upload` | multipart: `file` (.txt/.vtt/.json), `title?`, `date?`, `participants?` (comma-separated) | `MeetingDetail`, 201 |
| GET | `/api/meetings/{id}` | | `MeetingDetail` |
| PATCH | `/api/meetings/{id}` | `{ title?, participants? }` (participants replaces the full list) | `MeetingDetail` |
| DELETE | `/api/meetings/{id}` | | 204 |
| GET | `/api/meetings/{id}/transcript` | | `Segment[]` sorted by `idx` |
| POST | `/api/meetings/{id}/summarize` | | `MeetingDetail`, regenerates summary + chapters; adds extracted action items only if the meeting has none |
| POST | `/api/meetings/{id}/action-items` | `{ text, assignee_name? }` | `ActionItem`, 201 |
| PATCH | `/api/action-items/{id}` | `{ text?, completed?, assignee_name? }` | `ActionItem` |
| DELETE | `/api/action-items/{id}` | | 204 |
| GET | `/api/search` | query `q` | `SearchHit[]` (max 50, newest meeting first) |

`GET /api/search` returns `[]` for a query under 2 characters rather than a 422. This is a
deliberate deviation from a stricter reading of the contract, made because the frontend calls
search as the user types: an empty result is a better experience than an error flashing on every
keystroke before the second character.

See `docs/CONTRACT.md` for the full JSON shapes (`Participant`, `Summary`, `Chapter`,
`ActionItem`, `Segment`, `MeetingListItem`, `MeetingDetail`, `SearchHit`).

## Summaries

Every meeting gets a summary (overview + keywords), a set of chapters, and, when the meeting is
first created, extracted action items. Three sources, tried in this order:

1. **Seed** (`generated_by: "seed"`): the six bundled meetings under `backend/app/seed/data/`
   ship with a hand-written summary, chapters, and action items baked into their JSON files.
2. **LLM** (`generated_by: "llm"`): if `ANTHROPIC_API_KEY` is set, new meetings (create, upload,
   or an explicit `POST /summarize`) are summarized by calling the Anthropic API
   (`backend/app/services/summarizer.py`, model from `LLM_MODEL`, default
   `claude-haiku-4-5-20251001`) with a prompt asking for strict JSON back. This is optional; the
   app runs fully without a key.
3. **Heuristic fallback** (`generated_by: "heuristic"`): used when no key is set, or if the LLM
   call fails or returns something that doesn't parse as the expected JSON (network error, bad
   JSON, anything). It is deterministic: the overview is built from participant names, segment
   count, and duration, plus the first few substantive lines; keywords come from word-frequency
   counting after stripping stopwords and participant names; chapters are formed by chunking the
   transcript into 1-6 roughly-equal pieces and titling each from its most frequent words; action
   items are transcript lines matching a small set of regex patterns (`I'll`, `we need to`,
   `can you`, `let's`, `action item`, `follow up`, `by friday`, etc).

## Transcript upload formats

Accepted for both `POST /api/meetings` (paste box, always plain text) and
`POST /api/meetings/upload` (`.txt`, `.vtt`, `.json`).

### Plain text (`.txt`)

One utterance per line. A timestamp prefix is optional; lines without a `Name:` prefix are
appended to the previous speaker's line.

```
[00:01:23] Priya Sharma: Let's get started with the roadmap review.
Marcus Johnson: Sounds good, I pulled the numbers from last sprint.
That took longer than expected, by the way.
```

The third line above has no speaker prefix, so it is appended to Marcus's line. If no timestamps
are given at all, times are synthesized back-to-back at roughly 150 words per minute.

### WebVTT (`.vtt`)

Standard cues. Speaker comes from a `<v Name>` tag or a leading `Name:`, otherwise the speaker is
labeled "Speaker 1".

```
WEBVTT

00:00:00.000 --> 00:00:04.500
<v Priya Sharma>Let's get started with the roadmap review.

00:00:04.500 --> 00:00:09.000
Marcus Johnson: Sounds good, I pulled the numbers.
```

### JSON (`.json`)

Either a bare array or an object with a `segments` key. `end` is optional; if every item omits it,
times are synthesized the same way as plain text.

```json
{
  "segments": [
    { "speaker": "Priya Sharma", "start": 0.0, "end": 4.5, "text": "Let's get started." },
    { "speaker": "Marcus Johnson", "start": 4.5, "end": 9.0, "text": "Sounds good." }
  ]
}
```

## Local setup

### Backend

Windows (PowerShell), from the repo root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

macOS/Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The database (`backend/fireflies.db`, SQLite) is created automatically on first run, and the six
seed meetings load automatically if the `meetings` table is empty. There is nothing else to set up
to see real data. `ANTHROPIC_API_KEY` is optional; without it, new meetings you create use the
heuristic summarizer.

Run the test suite (from `backend/`, with the virtualenv active):

```
python -m pytest
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (see `frontend/.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open `http://localhost:3000`. The backend must already be running on port 8000.

## Deployment

### Backend on Render

A `render.yaml` blueprint sits at the repo root. In the Render dashboard: New -> Blueprint,
point it at this repository, and Render reads `render.yaml`. It defines one Python web service
with `rootDir: backend`, so Render treats `backend/` as the service root for the build and start
commands below:

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `PYTHON_VERSION` is pinned to `3.13.2` (the version this app was developed against) via an
  env var, which is Render's documented way to pin a Python version for a web service.
- `CORS_ORIGINS` and `ANTHROPIC_API_KEY` are marked `sync: false` in the blueprint, which means
  Render prompts for their values during setup instead of storing them in the YAML. Set
  `CORS_ORIGINS` to your deployed Vercel URL (e.g. `https://your-app.vercel.app`) and, optionally,
  `ANTHROPIC_API_KEY` if you want LLM summaries in production.

Render's free web services spin down after 15 minutes with no inbound traffic and take about a
minute to spin back up on the next request, so the first request after idling will be slow.
Free services also have an ephemeral filesystem: anything written to disk, including the SQLite
database file, is lost on every redeploy, restart, or spin-down. In practice this means the
deployed backend re-seeds its six demo meetings from scratch each time it restarts, and anything
you create or upload after that will disappear on the next restart. That is expected for this
assignment; a real deployment would use a managed Postgres database instead of SQLite on local
disk.

### Frontend on Vercel

No `vercel.json` is needed; Vercel auto-detects Next.js.

1. Import this repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable: `NEXT_PUBLIC_API_URL` = your Render service URL
   (e.g. `https://fireflies-clone-api.onrender.com`).
4. Deploy.

## Assumptions and trade-offs

- There is no real audio or video. The "player" is a simulated clock (`usePlayer`) driven off
  `duration_sec`; it exists to make the transcript-sync UX demonstrable, not to play media.
- Single user, no auth. Every action is attributed to a default user, "Demo User", per the
  contract.
- SQLite is fine for a single-user demo but is not meant to survive a production deploy on a free
  host with an ephemeral disk; see the Deployment section above.
- The heuristic summarizer is intentionally simple (word-frequency keywords, regex-based action
  item detection, even chunking for chapters). It exists so the app works with zero external
  dependencies; the LLM path is a strict improvement when a key is available, not a requirement.
- `GET /api/search` returns `[]` under 2 characters instead of a 422, favoring a smoother
  as-you-type search experience over stricter validation (see API overview above).
- Participant de-dup is intentionally simple: match by email if given, else by exact (case-
  sensitive, whitespace-trimmed) name. Two different people who happen to share a name with no
  email on file will be merged into one participant; this is accepted as a known limitation for a
  demo dataset.
- Transcript parsing assumes reasonably well-formed input matching the three documented formats.
  Malformed lines are best-effort (dropped or appended to the previous speaker) rather than
  rejected outright.
- The seed data (six meetings for the fictional company "Acme Analytics") is entirely made up,
  written specifically for this project. Any resemblance to real people, companies, or meetings is
  coincidental.
