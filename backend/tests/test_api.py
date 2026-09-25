"""End-to-end API tests against a temp sqlite DB seeded from tests/fixtures."""
import json
import os
import tempfile
from pathlib import Path

# Point the app at a throwaway DB and disable the LLM path *before* importing
# app.config (module-level settings are read once, at import time).
TEST_DB_PATH = Path(tempfile.gettempdir()) / "fireflies_test.db"
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.seed.seed import seed_if_empty

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db, data_dir=FIXTURES_DIR)
    finally:
        db.close()
    yield
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_meetings_includes_seed_fixture():
    resp = client.get("/api/meetings")
    assert resp.status_code == 200
    titles = [m["title"] for m in resp.json()]
    assert "Fixture Sync" in titles


def test_list_meetings_filters_and_sort():
    resp = client.get("/api/meetings", params={"q": "fixture"})
    assert resp.status_code == 200
    assert all("fixture" in m["title"].lower() for m in resp.json())

    resp = client.get("/api/meetings", params={"date_from": "2026-01-01", "date_to": "2026-12-31"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    resp = client.get("/api/meetings", params={"sort": "oldest"})
    dates = [m["date"] for m in resp.json()]
    assert dates == sorted(dates)


def test_participants_endpoint():
    resp = client.get("/api/participants")
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Alice Doe" in names
    assert names == sorted(names)


def test_create_meeting_with_timestamped_text():
    transcript = (
        "[00:00:00] Priya: Let's start the planning meeting.\n"
        "[00:00:05] Jon: Sounds good, I'll draft the agenda.\n"
    )
    resp = client.post(
        "/api/meetings",
        json={"title": "Timestamped Meeting", "transcript_text": transcript, "participants": []},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Timestamped Meeting"
    segs = client.get(f"/api/meetings/{body['id']}/transcript").json()
    assert segs[0]["start_sec"] == 0.0
    assert segs[1]["start_sec"] == 5.0
    assert body["summary"]["generated_by"] == "heuristic"
    assert len(body["action_items"]) >= 1  # "I'll draft the agenda" should be picked up


def test_create_meeting_with_untimestamped_text():
    transcript = "Priya: This is the first thing said.\nJon: And this is the reply.\n"
    resp = client.post(
        "/api/meetings",
        json={"title": "Untimestamped Meeting", "transcript_text": transcript},
    )
    assert resp.status_code == 201
    body = resp.json()
    segs = client.get(f"/api/meetings/{body['id']}/transcript").json()
    assert segs[0]["start_sec"] == 0.0
    assert segs[1]["start_sec"] > 0.0  # synthesized from the first segment's estimated duration


def test_create_meeting_rejects_empty_transcript():
    resp = client.post("/api/meetings", json={"title": "Empty", "transcript_text": ""})
    assert resp.status_code == 400


def test_upload_txt():
    content = "Alice: Hello everyone.\nBob: Hi Alice, ready to start?\n"
    resp = client.post(
        "/api/meetings/upload",
        files={"file": ("notes.txt", content, "text/plain")},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "notes"  # filename without extension, no title given
    assert body["source"] == "upload"


def test_upload_vtt():
    content = (
        "WEBVTT\n\n"
        "00:00:00.000 --> 00:00:03.000\n"
        "<v Alice>Hello everyone</v>\n\n"
        "00:00:03.000 --> 00:00:07.000\n"
        "Bob: Hi there, let's get going\n"
    )
    resp = client.post(
        "/api/meetings/upload",
        files={"file": ("call.vtt", content, "text/vtt")},
        data={"title": "VTT Call"},
    )
    assert resp.status_code == 201
    segs = client.get(f"/api/meetings/{resp.json()['id']}/transcript").json()
    assert segs[0]["speaker_label"] == "Alice"
    assert segs[0]["start_sec"] == 0.0
    assert segs[1]["end_sec"] == 7.0


def test_upload_json():
    content = json.dumps(
        {
            "segments": [
                {"speaker": "Alice", "start": 0, "end": 4, "text": "Hello there"},
                {"speaker": "Bob", "start": 4, "end": 8, "text": "Hi Alice"},
            ]
        }
    )
    resp = client.post(
        "/api/meetings/upload",
        files={"file": ("meeting.json", content, "application/json")},
        data={"participants": "Alice,Bob,Extra Person"},
    )
    assert resp.status_code == 201
    body = resp.json()
    names = {p["name"] for p in body["participants"]}
    assert {"Alice", "Bob", "Extra Person"}.issubset(names)


def test_upload_rejects_bad_extension():
    resp = client.post(
        "/api/meetings/upload",
        files={"file": ("notes.pdf", "whatever", "application/pdf")},
    )
    assert resp.status_code == 400


def test_get_meeting_detail_and_patch():
    resp = client.post(
        "/api/meetings",
        json={"title": "Original Title", "transcript_text": "Sam: Just a quick chat.\n"},
    )
    meeting_id = resp.json()["id"]

    detail = client.get(f"/api/meetings/{meeting_id}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "Original Title"

    patched = client.patch(
        f"/api/meetings/{meeting_id}",
        json={"title": "Renamed Title", "participants": ["New Person"]},
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["title"] == "Renamed Title"
    assert [p["name"] for p in body["participants"]] == ["New Person"]


def test_action_items_crud():
    resp = client.post(
        "/api/meetings",
        json={"title": "Action Item Meeting", "transcript_text": "Sam: Just chatting, nothing actionable.\n"},
    )
    meeting_id = resp.json()["id"]

    created = client.post(
        f"/api/meetings/{meeting_id}/action-items",
        json={"text": "Send the invite", "assignee_name": "Sam"},
    )
    assert created.status_code == 201
    item = created.json()
    assert item["text"] == "Send the invite"
    assert item["assignee"]["name"] == "Sam"
    assert item["completed"] is False

    completed = client.patch(f"/api/action-items/{item['id']}", json={"completed": True})
    assert completed.status_code == 200
    assert completed.json()["completed"] is True

    deleted = client.delete(f"/api/action-items/{item['id']}")
    assert deleted.status_code == 204

    detail = client.get(f"/api/meetings/{meeting_id}").json()
    assert item["id"] not in [ai["id"] for ai in detail["action_items"]]


def test_delete_meeting_cascades():
    resp = client.post(
        "/api/meetings",
        json={"title": "To Delete", "transcript_text": "Casey: This meeting will be deleted.\n"},
    )
    meeting_id = resp.json()["id"]

    deleted = client.delete(f"/api/meetings/{meeting_id}")
    assert deleted.status_code == 204

    assert client.get(f"/api/meetings/{meeting_id}").status_code == 404
    assert client.get(f"/api/meetings/{meeting_id}/transcript").status_code == 404

    # The participant row survives the cascade (only meeting-owned rows are deleted),
    # but /api/participants only lists people who are still in some meeting.
    from app.models import Participant
    with SessionLocal() as db:
        assert db.query(Participant).filter(Participant.name == "Casey").count() == 1
    names = [p["name"] for p in client.get("/api/participants").json()]
    assert "Casey" not in names


def test_summarize_endpoint():
    resp = client.post(
        "/api/meetings",
        json={"title": "Resummarize Me", "transcript_text": "Dana: A plain statement with no action verbs at all.\n"},
    )
    meeting_id = resp.json()["id"]

    resummarized = client.post(f"/api/meetings/{meeting_id}/summarize")
    assert resummarized.status_code == 200
    assert resummarized.json()["summary"]["generated_by"] == "heuristic"


def test_search():
    client.post(
        "/api/meetings",
        json={"title": "Search Target", "transcript_text": "Robin: The word zzzqux appears only here.\n"},
    )
    resp = client.get("/api/search", params={"q": "zzzqux"})
    assert resp.status_code == 200
    hits = resp.json()
    assert len(hits) == 1
    assert "zzzqux" in hits[0]["text"]


def test_search_short_query_returns_empty():
    resp = client.get("/api/search", params={"q": "a"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_404s():
    assert client.get("/api/meetings/999999").status_code == 404
    assert client.patch("/api/meetings/999999", json={"title": "x"}).status_code == 404
    assert client.delete("/api/meetings/999999").status_code == 404
    assert client.get("/api/meetings/999999/transcript").status_code == 404
    assert client.post("/api/meetings/999999/summarize").status_code == 404
    assert client.post("/api/meetings/999999/action-items", json={"text": "x"}).status_code == 404
    assert client.patch("/api/action-items/999999", json={"completed": True}).status_code == 404
    assert client.delete("/api/action-items/999999").status_code == 404
