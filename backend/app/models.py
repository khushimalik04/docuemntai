"""SQLAlchemy 2.0 typed models, matching the tables in CONTRACT.md."""
from datetime import datetime
from typing import Optional, Union

from sqlalchemy import ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    date: Mapped[datetime]
    duration_sec: Mapped[float]
    source: Mapped[str]  # "seed" | "upload" | "form"
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    participants: Mapped[list["Participant"]] = relationship(
        secondary="meeting_participants", back_populates="meetings"
    )
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptSegment.idx"
    )
    summary: Mapped[Optional["Summary"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Chapter.start_sec"
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id"
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (UniqueConstraint("email", name="uq_participant_email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    email: Mapped[Optional[str]] = mapped_column(default=None)

    meetings: Mapped[list["Meeting"]] = relationship(
        secondary="meeting_participants", back_populates="participants"
    )


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True
    )


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (Index("ix_segments_meeting_idx", "meeting_id", "idx"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    idx: Mapped[int]
    speaker_label: Mapped[str]
    speaker_participant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("participants.id"), default=None
    )
    start_sec: Mapped[float]
    end_sec: Mapped[float]
    text: Mapped[str]

    meeting: Mapped["Meeting"] = relationship(back_populates="segments")


class Summary(Base):
    __tablename__ = "summaries"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    overview: Mapped[str]
    keywords: Mapped[str]  # JSON-encoded list[str]
    generated_by: Mapped[str]  # "seed" | "llm" | "heuristic"

    meeting: Mapped["Meeting"] = relationship(back_populates="summary")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    title: Mapped[str]
    start_sec: Mapped[float]

    meeting: Mapped["Meeting"] = relationship(back_populates="chapters")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    text: Mapped[str]
    completed: Mapped[bool] = mapped_column(default=False)
    assignee_participant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("participants.id"), default=None
    )
    segment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")
    assignee: Mapped[Optional["Participant"]] = relationship()
    segment: Mapped[Optional["TranscriptSegment"]] = relationship()
