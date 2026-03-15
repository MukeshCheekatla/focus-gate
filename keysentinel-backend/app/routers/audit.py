from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.audit import compute_audit_report, compute_global_audit
from typing import Any
import uuid

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/projects/{project_id}", response_model=dict)
async def project_audit(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await compute_audit_report(project_id, db)


@router.get("/global", response_model=dict)
async def global_audit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await compute_global_audit(current_user.id, db)
