# KeySentinel Backend

FastAPI backend for KeySentinel — Developer API Key Vault & Secrets Management.

## Stack
- FastAPI (Python)
- PostgreSQL + SQLAlchemy + Alembic
- AES-256 encryption (Fernet)
- JWT authentication + bcrypt
- APScheduler (nightly expiry jobs)

## Features
- Centralized encrypted API key vault
- Expiry & rotation reminders
- GitHub secret leak scanner
- Key health audit report
- Rotation workflow tracker
- Slack/webhook alerting
- Project-based access scoping

## Tests
13/13 tests passing (pytest + pytest-asyncio)

## Deployment
Deploy to Render using render.yaml
