"""Pydantic v2 request/response models matching CONTRACT.md JSON shapes."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str | None


class SummaryOut(BaseModel):
    overview: str
    keywords: list[str]
    generated_by: str


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    start_sec: float


class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    text: str
    completed: bool
    assignee: ParticipantOut | None
    segment_id: int | None
    start_sec: float | None
    created_at: datetime


class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    idx: int
    speaker_label: str
    speaker_participant_id: int | None
    start_sec: float
    end_sec: float
    text: str


class MeetingListItemOut(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: float
    source: str
    participants: list[ParticipantOut]
    summary_snippet: str | None
    open_action_items: int


class MeetingDetailOut(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: float
    source: str
    participants: list[ParticipantOut]
    summary: SummaryOut | None
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]


class SearchHitOut(BaseModel):
    meeting_id: int
    meeting_title: str
    meeting_date: datetime
    segment_id: int
    start_sec: float
    speaker_label: str
    text: str


# ---- Requests ----

class MeetingCreateIn(BaseModel):
    title: str
    date: datetime | None = None
    participants: list[str] | None = None
    transcript_text: str


class MeetingPatchIn(BaseModel):
    title: str | None = None
    participants: list[str] | None = None


class ActionItemCreateIn(BaseModel):
    text: str
    assignee_name: str | None = None


class ActionItemPatchIn(BaseModel):
    text: str | None = None
    completed: bool | None = None
    assignee_name: str | None = None
