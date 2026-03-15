from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, MemberOut, MemberInvite, MemberUpdateRole
from app.middleware.auth import get_current_user
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])


async def get_project_or_404(project_id: uuid.UUID, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def assert_project_access(project: Project, user: User, db: AsyncSession, require_owner: bool = False) -> None:
    if project.owner_id == user.id:
        return
    if require_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the project owner can perform this action")
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = Project(id=uuid.uuid4(), owner_id=current_user.id, name=body.name, description=body.description)
    db.add(project)
    member = ProjectMember(id=uuid.uuid4(), project_id=project.id, user_id=current_user.id, role="owner")
    db.add(member)
    await db.flush()
    return project


@router.get("/", response_model=list[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Project]:
    result = await db.execute(
        select(Project).join(ProjectMember, ProjectMember.project_id == Project.id).where(
            ProjectMember.user_id == current_user.id
        )
    )
    return list(result.scalars().all())


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db, require_owner=True)
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    await db.flush()
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db, require_owner=True)
    await db.delete(project)


@router.get("/{project_id}/members", response_model=list[MemberOut])
async def list_members(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectMember]:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db)
    result = await db.execute(select(ProjectMember).where(ProjectMember.project_id == project_id))
    return list(result.scalars().all())


@router.post("/{project_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    project_id: uuid.UUID,
    body: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectMember:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db, require_owner=True)
    user_result = await db.execute(select(User).where(User.email == body.email))
    invite_user = user_result.scalar_one_or_none()
    if not invite_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with that email not found")
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == invite_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")
    member = ProjectMember(id=uuid.uuid4(), project_id=project_id, user_id=invite_user.id, role=body.role)
    db.add(member)
    await db.flush()
    return member


@router.patch("/{project_id}/members/{member_id}", response_model=MemberOut)
async def update_member_role(
    project_id: uuid.UUID,
    member_id: uuid.UUID,
    body: MemberUpdateRole,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectMember:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db, require_owner=True)
    result = await db.execute(select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    member.role = body.role
    await db.flush()
    return member


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: uuid.UUID,
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    project = await get_project_or_404(project_id, db)
    await assert_project_access(project, current_user, db, require_owner=True)
    result = await db.execute(select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    await db.delete(member)
