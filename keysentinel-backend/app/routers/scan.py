from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.scan_result import ScanResult
from app.models.project import Project
from app.schemas.scan import ScanRequest, ScanResultOut
from app.services.scanner import scan_github_repo
import uuid

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/", response_model=ScanResultOut, status_code=status.HTTP_201_CREATED)
async def trigger_scan(
    body: ScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResult:
    result = await db.execute(select(Project).where(Project.id == body.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only project owner can trigger scans")
    if not current_user.github_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub token not configured.")
    try:
        findings = await scan_github_repo(body.repo, current_user.github_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    scan = ScanResult(id=uuid.uuid4(), project_id=body.project_id, repo=body.repo, findings=findings)
    db.add(scan)
    await db.flush()
    return scan


@router.get("/results", response_model=list[ScanResultOut])
async def list_scan_results(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScanResult]:
    result = await db.execute(
        select(ScanResult).join(Project, ScanResult.project_id == Project.id)
        .where(Project.owner_id == current_user.id).order_by(ScanResult.scanned_at.desc())
    )
    return list(result.scalars().all())


@router.get("/results/{result_id}", response_model=ScanResultOut)
async def get_scan_result(
    result_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResult:
    result = await db.execute(
        select(ScanResult).join(Project, ScanResult.project_id == Project.id)
        .where(ScanResult.id == result_id, Project.owner_id == current_user.id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan result not found")
    return scan
