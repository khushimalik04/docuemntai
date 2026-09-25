"""Shared logic for building/reading meetings. Routers stay thin and call into here."""
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from app.models import ActionItem, Chapter, Meeting, Participant, Summary, TranscriptSegment
from app.schemas import (
    ActionItemOut,
    ChapterOut,
    MeetingDetailOut,
    MeetingListItemOut,
    ParticipantOut,
    SummaryOut,
)
from app.services import summarizer


def get_or_create_participant(db: Session, name: str, email: Optional[str] = None) -> Participant:
    """Dedup rule from the contract: match by email if given, else by exact name."""
    name = name.strip()
    if email:
        email = email.strip()
        existing = db.query(Participant).filter(Participant.email == email).first()
    else:
        existing = db.query(Participant).filter(Participant.name == name).first()
    if existing:
        return existing

    participant = Participant(name=name, email=email)
    db.add(participant)
    db.flush()  # need the generated id before it's referenced elsewhere
    return participant


def find_segment_containing(segments: List[TranscriptSegment], time_sec: float) -> Optional[TranscriptSegment]:
    """Used for LLM/heuristic action items, which give a moment in time."""
    for seg in segments:
        if seg.start_sec <= time_sec < seg.end_sec:
            return seg
    if segments:
        return min(segments, key=lambda s: abs(s.start_sec - time_sec))
    return None


def find_segment_by_exact_start(segments: List[TranscriptSegment], start_sec: float) -> Optional[TranscriptSegment]:
    """Used for seed data, which links action items by an exact segment start."""
    for seg in segments:
        if seg.start_sec == start_sec:
            return seg
    return None


def build_meeting(
    db: Session,
    *,
    title: str,
    date: Optional[datetime],
    source: str,
    participant_names: List[str],
    parsed_segments: List[Dict[str, Any]],
    api_key: Optional[str],
    model: Optional[str],
) -> Meeting:
    """Create a meeting (form or upload) from parsed segments and run the summarizer."""
    if not parsed_segments:
        raise ValueError("Transcript has no content")

    duration = parsed_segments[-1]["end"]
    meeting = Meeting(title=title, date=date or datetime.utcnow(), duration_sec=duration, source=source)
    db.add(meeting)
    db.flush()

    speaker_names = [s["speaker"] for s in parsed_segments]
    all_names = list(dict.fromkeys(n.strip() for n in list(participant_names) + speaker_names if n.strip()))  # unique, order preserved
    speaker_map: Dict[str, Participant] = {}
    for name in all_names:
        participant = get_or_create_participant(db, name)
        meeting.participants.append(participant)
        speaker_map[name] = participant

    segments = _add_segments(db, meeting, parsed_segments, speaker_map)
    db.flush()

    summary_data = summarizer.summarize(parsed_segments, list(speaker_map.keys()), api_key, model)
    _apply_summary_and_chapters(db, meeting, summary_data)
    _apply_action_items(db, meeting, segments, summary_data["action_items"], speaker_map)

    db.commit()
    db.refresh(meeting)
    return meeting


def resummarize_meeting(db: Session, meeting: Meeting, api_key: Optional[str], model: Optional[str]) -> Meeting:
    """POST /meetings/{id}/summarize: regenerate summary + chapters always;
    only add extracted action items if the meeting currently has none."""
    segments = sorted(meeting.segments, key=lambda s: s.idx)
    segment_dicts = [
        {"speaker": s.speaker_label, "start": s.start_sec, "end": s.end_sec, "text": s.text} for s in segments
    ]
    participant_names = [p.name for p in meeting.participants]

    summary_data = summarizer.summarize(segment_dicts, participant_names, api_key, model)
    _apply_summary_and_chapters(db, meeting, summary_data)

    if not meeting.action_items:
        speaker_map = {p.name: p for p in meeting.participants}
        _apply_action_items(db, meeting, segments, summary_data["action_items"], speaker_map)

    db.commit()
    db.refresh(meeting)
    return meeting


def replace_participants(db: Session, meeting: Meeting, names: List[str]) -> None:
    meeting.participants.clear()
    for name in dict.fromkeys(n.strip() for n in names if n.strip()):
        meeting.participants.append(get_or_create_participant(db, name))


def _add_segments(
    db: Session, meeting: Meeting, parsed_segments: List[Dict[str, Any]], speaker_map: Dict[str, Participant]
) -> List[TranscriptSegment]:
    segments = []
    for idx, seg in enumerate(parsed_segments):
        participant = speaker_map.get(seg["speaker"])
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
    return segments


def _apply_summary_and_chapters(db: Session, meeting: Meeting, summary_data: Dict[str, Any]) -> None:
    if meeting.summary:
        db.delete(meeting.summary)
        db.flush()
    db.add(
        Summary(
            meeting_id=meeting.id,
            overview=summary_data["overview"],
            keywords=json.dumps(summary_data["keywords"]),
            generated_by=summary_data["generated_by"],
        )
    )

    for chapter in list(meeting.chapters):
        db.delete(chapter)
    db.flush()
    for chapter in summary_data["chapters"]:
        db.add(Chapter(meeting_id=meeting.id, title=chapter["title"], start_sec=chapter["start_sec"]))


def _apply_action_items(
    db: Session,
    meeting: Meeting,
    segments: List[TranscriptSegment],
    action_items_data: List[Dict[str, Any]],
    speaker_map: Dict[str, Participant],
) -> None:
    for item in action_items_data:
        assignee = None
        name = item.get("assignee")
        if name:
            assignee = speaker_map.get(name) or get_or_create_participant(db, name)
        segment = None
        if item.get("start_sec") is not None:
            segment = find_segment_containing(segments, item["start_sec"])
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=item["text"],
                completed=item.get("completed", False),
                assignee_participant_id=assignee.id if assignee else None,
                segment_id=segment.id if segment else None,
            )
        )


# ---- DTO builders ----

def summary_snippet(overview: str) -> str:
    text = overview.replace("\n\n", " ").strip()
    if len(text) <= 160:
        return text
    cut = text[:160]
    last_space = cut.rfind(" ")
    if last_space > 0:
        cut = cut[:last_space]
    return cut + "..."


def to_list_item(meeting: Meeting) -> MeetingListItemOut:
    open_count = sum(1 for ai in meeting.action_items if not ai.completed)
    snippet = summary_snippet(meeting.summary.overview) if meeting.summary else None
    return MeetingListItemOut(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        duration_sec=meeting.duration_sec,
        source=meeting.source,
        participants=[ParticipantOut.model_validate(p) for p in meeting.participants],
        summary_snippet=snippet,
        open_action_items=open_count,
    )


def to_action_item_out(ai: ActionItem) -> ActionItemOut:
    return ActionItemOut(
        id=ai.id,
        meeting_id=ai.meeting_id,
        text=ai.text,
        completed=ai.completed,
        assignee=ParticipantOut.model_validate(ai.assignee) if ai.assignee else None,
        segment_id=ai.segment_id,
        start_sec=ai.segment.start_sec if ai.segment else None,
        created_at=ai.created_at,
    )


def to_detail(meeting: Meeting) -> MeetingDetailOut:
    summary_out = None
    if meeting.summary:
        summary_out = SummaryOut(
            overview=meeting.summary.overview,
            keywords=json.loads(meeting.summary.keywords),
            generated_by=meeting.summary.generated_by,
        )
    return MeetingDetailOut(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        duration_sec=meeting.duration_sec,
        source=meeting.source,
        participants=[ParticipantOut.model_validate(p) for p in meeting.participants],
        summary=summary_out,
        chapters=[ChapterOut.model_validate(c) for c in meeting.chapters],
        action_items=[to_action_item_out(ai) for ai in meeting.action_items],
    )
