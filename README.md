# MeetMind (Meeting AI & Transcription Workspace)

A modern, full-stack meeting intelligence application: upload or paste meeting transcripts to generate automatic summaries, chapters, action items, and an interactive time-synced transcript viewer.

Built as an end-to-end full-stack meeting workspace application with zero required external API dependencies.

---

## 🚀 Live Demo & Deployment

- **Frontend App**: [https://docuemntai.vercel.app](https://docuemntai.vercel.app)
- **Backend API**: [https://meetmind-vb83.onrender.com](https://meetmind-vb83.onrender.com)
- **GitHub Repository**: [https://github.com/khushimalik04/docuemntai](https://github.com/khushimalik04/docuemntai)

---

## ✨ Features

- **Meeting Dashboard**: Real-time title search, date range picker, participant filtering, and sorting (recent / oldest).
- **Transcript Ingestion**: Create meetings by raw text input, or by uploading `.txt`, `.vtt` (WebVTT), or `.json` files.
- **AI-Powered & Heuristic Summaries**: Overview generation, keyword extraction, topic chapters, and action items extraction.
- **Interactive Time-Synced Transcript**: Simulated audio player with click-to-seek, auto-scroll, active line highlighting, and keyboard navigation.
- **Deep Linking**: Share timestamped URLs (`?t=123`) to open a meeting auto-scrolled to an exact moment.
- **Action Item Management**: Create, edit, toggle completion, delete, and jump directly to the transcript segment where an action item was spoken.
- **Meeting Exports**: Download full meeting transcripts and summaries in Markdown (`.md`) or Plain Text (`.txt`).
- **Participant De-duplication**: Automatic deduplication across meetings by email address or exact name.
- **Global Search**: Search across all meeting transcripts instantly with highlighted query matches.

### Placeholders / Coming Soon Shells
- Live Notetaker (bot integration)
- External Integrations (Calendar, Zoom, Google Meet, CRM)
- Workspace Team & Analytics

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Sonner.
- **Backend**: Python 3.9+, FastAPI, SQLAlchemy 2.0, SQLite, Pydantic v2, Pytest, Uvicorn, Optional Anthropic API (`claude-haiku-4-5-20251001`).

---

## 🏗️ Architecture

```
Browser  <-- HTTP/JSON -->  Next.js Frontend (Vercel)  <-- HTTP/JSON -->  FastAPI Backend (Render)  <-->  SQLite DB
```

### Backend Structure (`backend/`)
```
app/
  routers/        FastAPI route handlers (meetings, action items, search)
  services/       Business logic (parsers, meeting service, summarizer)
  models.py       SQLAlchemy 2.0 ORM models
  schemas.py      Pydantic v2 schemas
  config.py       Environment configuration
  seed/           Idempotent seed data loader (6 pre-loaded Acme Analytics meetings)
tests/            End-to-end API test suite (18 unit/integration tests)
```

---

## 💻 Local Quickstart

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install "fastapi>=0.115.0" "uvicorn[standard]" "SQLAlchemy>=2.0.0" "pydantic>=2.0.0" python-multipart anthropic pytest httpx

# Run test suite
PYTHONPATH=. pytest

# Start development server on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

*The SQLite database (`fireflies.db`) is automatically created and seeded with 6 sample meetings on first boot.*

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create environment configuration
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run Next.js dev server on port 3000
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ☁️ Production Deployment Guide

### Deploying Backend on Render

1. Create a new **Web Service** or **Blueprint** on [Render](https://render.com).
2. Connect your GitHub repository (`khushimalik04/docuemntai`).
3. Set **Root Directory** to `backend`.
4. Configure build & runtime settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt` (or custom pip install command)
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app` (or `*` for testing)
   - `DATABASE_URL`: `sqlite:///./fireflies.db`
   - *(Optional)* `ANTHROPIC_API_KEY`: Your Anthropic API Key for LLM summarization.

### Deploying Frontend on Vercel

1. Import your repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://meetmind-vb83.onrender.com`
4. Click **Deploy**.

---

## 📄 API Reference Overview

Base Endpoint: `/api`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/meetings` | List & filter meetings (`q`, `participant_id`, `date_from`, `date_to`, `sort`) |
| `POST` | `/api/meetings` | Create meeting from raw transcript text |
| `POST` | `/api/meetings/upload` | Create meeting by uploading `.txt`, `.vtt`, or `.json` file |
| `GET` | `/api/meetings/{id}` | Get meeting details |
| `PATCH` | `/api/meetings/{id}` | Update title or participants |
| `DELETE` | `/api/meetings/{id}` | Delete meeting (cascades related items) |
| `GET` | `/api/meetings/{id}/transcript` | Get full transcript segments |
| `POST` | `/api/meetings/{id}/summarize` | Re-run summary and chapter extraction |
| `POST` | `/api/meetings/{id}/action-items` | Add a manual action item |
| `PATCH` | `/api/action-items/{id}` | Update text/status/assignee for an action item |
| `DELETE` | `/api/action-items/{id}` | Delete action item |
| `GET` | `/api/search` | Search full-text transcripts |

---

## 📝 License

Distributed under the MIT License.
