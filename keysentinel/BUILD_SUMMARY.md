# KeySentinel - Autonomous Build #1

Full-stack developer secrets management SaaS built autonomously.

**Stack:** FastAPI + PostgreSQL + Next.js 14 + Tailwind CSS
**Tests:** 13/13 passing

## Features
- AES-256 encrypted API key vault
- Expiry & rotation reminders
- GitHub secret leak scanner
- Key health audit report
- Rotation workflow tracker
- Slack/webhook alerting
- Project-based access scoping

## Code
- keysentinel-backend/ (FastAPI)
- keysentinel-frontend/ (Next.js 14)

## Test Results
- test_audit.py: 5/5 PASS
- test_auth.py: 5/5 PASS
- test_keys.py: 3/3 PASS
- Total: 13/13 PASS
