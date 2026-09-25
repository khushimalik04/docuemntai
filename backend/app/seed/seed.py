"""Load seed meeting JSON files into the DB. Idempotent: only runs when
the meetings table is empty. Also runnable standalone: `python -m app.seed.seed`.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.models import ActionItem, Chapter, Meeting, Summary, TranscriptSegment
from app.services import meeting_service

DEFAULT_DATA_DIR = Path(__file__).parent / "data"


def load_one_meeting(db: Session, data: dict) -> Meeting:
    meeting = Meeting(
        title=data["title"],
        date=datetime.fromisoformat(data["date"]),
        duration_sec=0.0,
        source="seed",
    )
    db.add(meeting)
    db.flush()

    name_to_participant = {}
    for p in data.get("participants", []):
        participant = meeting_service.get_or_create_participant(db, p["name"], p.get("email"))
        meeting.participants.append(participant)
        name_to_participant[p["name"]] = participant

    segments_data = sorted(data["segments"], key=lambda s: s["start"])
    segments = []
    for idx, seg in enumerate(segments_data):
        participant = name_to_participant.get(seg["speaker"])
        ts = TranscriptSegment(
            meeting_id=meeting.id,
            idx=idx,
            speaker_label=seg["speaker"],
            speaker_participant_id=participant.id if participant else None,
            start_sec=seg["start"],
            end_sec=seg["end"],
            text=seg["text"],
        )
        db.add(ts)
        segments.append(ts)
    db.flush()

    meeting.duration_sec = segments_data[-1]["end"] if segments_data else 0.0

    summary_data = data.get("summary")
    if summary_data:
        db.add(
            Summary(
                meeting_id=meeting.id,
                overview=summary_data["overview"],
                keywords=json.dumps(summary_data["keywords"]),
                generated_by="seed",
            )
        )

    for chapter in data.get("chapters", []):
        db.add(Chapter(meeting_id=meeting.id, title=chapter["title"], start_sec=chapter["start"]))

    for action_item in data.get("action_items", []):
        assignee = name_to_participant.get(action_item.get("assignee"))
        segment = None
        if action_item.get("start") is not None:
            segment = meeting_service.find_segment_by_exact_start(segments, action_item["start"])
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=action_item["text"],
                completed=action_item.get("completed", False),
                assignee_participant_id=assignee.id if assignee else None,
                segment_id=segment.id if segment else None,
            )
        )

    return meeting


def seed_if_empty(db: Session, data_dir: Optional[Path] = None) -> int:
    if db.query(Meeting).count() > 0:
        return 0

    data_dir = data_dir or DEFAULT_DATA_DIR
    if not data_dir.exists():
        return 0

    files = sorted(data_dir.glob("*.json"))
    for file_path in files:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        load_one_meeting(db, data)
    db.commit()
    return len(files)


def main():
    from app.db import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = seed_if_empty(db)
        print(f"Loaded {count} seed meeting(s)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
