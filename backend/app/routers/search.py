"""Full-text-ish search across transcript segments."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Meeting, TranscriptSegment
from app.schemas import SearchHitOut

router = APIRouter(prefix="/api")


@router.get("/search", response_model=list[SearchHitOut])
def search(q: str = "", db: Session = Depends(get_db)):
    # Deviation note: contract says "min 2 chars -> 422 or empty list (pick one)".
    # We return an empty list, which is friendlier for a live-search-as-you-type UI.
    if len(q.strip()) < 2:
        return []

    pattern = f"%{q}%"
    rows = (
        db.query(TranscriptSegment, Meeting)
        .join(Meeting, TranscriptSegment.meeting_id == Meeting.id)
        .filter(TranscriptSegment.text.ilike(pattern))
        .order_by(Meeting.date.desc(), TranscriptSegment.idx.asc())
        .limit(50)
        .all()
    )
    return [
        SearchHitOut(
            meeting_id=meeting.id,
            meeting_title=meeting.title,
            meeting_date=meeting.date,
            segment_id=segment.id,
            start_sec=segment.start_sec,
            speaker_label=segment.speaker_label,
            text=segment.text,
        )
        for segment, meeting in rows
    ]
