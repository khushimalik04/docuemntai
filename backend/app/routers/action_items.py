"""Action item create/patch/delete endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ActionItem, Meeting
from app.schemas import ActionItemCreateIn, ActionItemOut, ActionItemPatchIn
from app.services import meeting_service

router = APIRouter(prefix="/api")


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
def create_action_item(meeting_id: int, payload: ActionItemCreateIn, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(404, "Meeting not found")

    assignee = None
    if payload.assignee_name:
        assignee = meeting_service.get_or_create_participant(db, payload.assignee_name)

    item = ActionItem(
        meeting_id=meeting_id,
        text=payload.text,
        assignee_participant_id=assignee.id if assignee else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return meeting_service.to_action_item_out(item)


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def patch_action_item(item_id: int, payload: ActionItemPatchIn, db: Session = Depends(get_db)):
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Action item not found")

    data = payload.model_dump(exclude_unset=True)
    if "text" in data:
        item.text = data["text"]
    if "completed" in data:
        item.completed = data["completed"]
    if "assignee_name" in data:
        name = data["assignee_name"]
        if name:
            item.assignee_participant_id = meeting_service.get_or_create_participant(db, name).id
        else:
            item.assignee_participant_id = None

    db.commit()
    db.refresh(item)
    return meeting_service.to_action_item_out(item)


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Action item not found")
    db.delete(item)
    db.commit()
    return None
