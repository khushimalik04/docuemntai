"""Meeting CRUD, upload, transcript, and summarize endpoints."""
from datetime import date as date_type, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.db import get_db
from app.models import ActionItem, Meeting, Participant, TranscriptSegment
from app.schemas import (
    MeetingCreateIn,
    MeetingDetailOut,
    MeetingListItemOut,
    MeetingPatchIn,
    ParticipantOut,
    SegmentOut,
)
from app.services import meeting_service, parsers

router = APIRouter(prefix="/api")


def _meeting_query(db: Session):
    """Eager-load everything a detail/list view needs to avoid N+1 queries."""
    return db.query(Meeting).options(
        selectinload(Meeting.participants),
        selectinload(Meeting.summary),
        selectinload(Meeting.chapters),
        selectinload(Meeting.action_items).selectinload(ActionItem.assignee),
        selectinload(Meeting.action_items).selectinload(ActionItem.segment),
    )


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/participants", response_model=list[ParticipantOut])
def list_participants(db: Session = Depends(get_db)):
    # Only people who are in at least one meeting, so the filter never offers empty results.
    return db.query(Participant).filter(Participant.meetings.any()).order_by(Participant.name).all()


@router.get("/meetings", response_model=list[MeetingListItemOut])
def list_meetings(
    q: str | None = None,
    participant_id: int | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    sort: str = "recent",
    db: Session = Depends(get_db),
):
    query = _meeting_query(db)
    if q:
        query = query.filter(Meeting.title.ilike(f"%{q}%"))
    if participant_id:
        query = query.filter(Meeting.participants.any(Participant.id == participant_id))
    if date_from:
        query = query.filter(Meeting.date >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        end_of_day = datetime.combine(date_to, datetime.max.time())
        query = query.filter(Meeting.date <= end_of_day)
    query = query.order_by(Meeting.date.asc() if sort == "oldest" else Meeting.date.desc())
    return [meeting_service.to_list_item(m) for m in query.all()]


@router.post("/meetings", response_model=MeetingDetailOut, status_code=201)
def create_meeting(payload: MeetingCreateIn, db: Session = Depends(get_db)):
    segments = parsers.parse_txt(payload.transcript_text)
    if not segments:
        raise HTTPException(400, "Transcript is empty")
    meeting = meeting_service.build_meeting(
        db,
        title=payload.title,
        date=payload.date,
        source="form",
        participant_names=payload.participants or [],
        parsed_segments=segments,
        api_key=settings.anthropic_api_key,
        model=settings.llm_model,
    )
    return meeting_service.to_detail(meeting)


@router.post("/meetings/upload", response_model=MeetingDetailOut, status_code=201)
async def upload_meeting(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    date: str | None = Form(None),
    participants: str | None = Form(None),
    db: Session = Depends(get_db),
):
    filename = file.filename or ""
    if not filename.lower().endswith((".txt", ".vtt", ".json")):
        raise HTTPException(400, "Only .txt, .vtt, and .json files are supported")

    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8-sig")  # utf-8-sig also strips a Windows BOM
    except UnicodeDecodeError:
        raise HTTPException(400, "File must be UTF-8 encoded text")
    try:
        segments = parsers.parse_transcript(filename, content)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    if not segments:
        raise HTTPException(400, "Transcript is empty")

    meeting_title = title or filename.rsplit(".", 1)[0]
    try:
        parsed_date = datetime.fromisoformat(date) if date else None
    except ValueError:
        raise HTTPException(400, "Invalid date, expected ISO format like 2026-09-18T10:30")
    participant_names = [n.strip() for n in participants.split(",") if n.strip()] if participants else []

    meeting = meeting_service.build_meeting(
        db,
        title=meeting_title,
        date=parsed_date,
        source="upload",
        participant_names=participant_names,
        parsed_segments=segments,
        api_key=settings.anthropic_api_key,
        model=settings.llm_model,
    )
    return meeting_service.to_detail(meeting)


@router.get("/meetings/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = _meeting_query(db).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return meeting_service.to_detail(meeting)


@router.patch("/meetings/{meeting_id}", response_model=MeetingDetailOut)
def patch_meeting(meeting_id: int, payload: MeetingPatchIn, db: Session = Depends(get_db)):
    meeting = _meeting_query(db).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        meeting.title = data["title"]
    if "participants" in data:
        meeting_service.replace_participants(db, meeting, data["participants"])

    db.commit()
    db.refresh(meeting)
    return meeting_service.to_detail(meeting)


@router.delete("/meetings/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    db.delete(meeting)
    db.commit()
    return None


@router.get("/meetings/{meeting_id}/transcript", response_model=list[SegmentOut])
def get_transcript(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.idx)
        .all()
    )


@router.post("/meetings/{meeting_id}/summarize", response_model=MeetingDetailOut)
def summarize_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = _meeting_query(db).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    meeting = meeting_service.resummarize_meeting(db, meeting, settings.anthropic_api_key, settings.llm_model)
    return meeting_service.to_detail(meeting)
