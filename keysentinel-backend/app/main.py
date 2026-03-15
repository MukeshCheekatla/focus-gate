from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, projects, keys, audit, scan, alerts
from app.services.scheduler import start_scheduler, stop_scheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: start scheduler on startup, stop on shutdown."""
    logger.info("KeySentinel API starting up...")
    start_scheduler()
    yield
    logger.info("KeySentinel API shutting down...")
    stop_scheduler()


app = FastAPI(
    title="KeySentinel API",
    description="Developer API Key Vault & Secrets Management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(keys.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(scan.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Health check endpoint for Render and load balancers."""
    return {"status": "ok", "service": "keysentinel-api", "version": "1.0.0"}
