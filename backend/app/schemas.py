"""Pydantic v2 request/response models matching CONTRACT.md JSON shapes."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: Optional[str] = None


class SummaryOut(BaseModel):
    overview: str
    keywords: List[str]
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
    assignee: Optional[ParticipantOut] = None
    segment_id: Optional[int] = None
    start_sec: Optional[float] = None
    created_at: datetime


class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    idx: int
    speaker_label: str
    speaker_participant_id: Optional[int] = None
    start_sec: float
    end_sec: float
    text: str


class MeetingListItemOut(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: float
    source: str
    participants: List[ParticipantOut]
    summary_snippet: Optional[str] = None
    open_action_items: int


class MeetingDetailOut(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: float
    source: str
    participants: List[ParticipantOut]
    summary: Optional[SummaryOut] = None
    chapters: List[ChapterOut]
    action_items: List[ActionItemOut]


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
    date: Optional[datetime] = None
    participants: Optional[List[str]] = None
    transcript_text: str


class MeetingPatchIn(BaseModel):
    title: Optional[str] = None
    participants: Optional[List[str]] = None


class ActionItemCreateIn(BaseModel):
    text: str
    assignee_name: Optional[str] = None


class ActionItemPatchIn(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    assignee_name: Optional[str] = None
