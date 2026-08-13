"""Lightweight FastAPI server exposing Revora analytics data from SQLite.

Run alongside the LiveKit agent so the deployed frontend can fetch
live quest state and escalation data from your local machine.

Usage:
    uv run python src/api_server.py

Runs on port 8082 by default (configurable via ANALYTICS_PORT env var).
"""

from __future__ import annotations

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from quest import get_state, init_quest
from escalations import list_escalations, init_escalations

app = FastAPI(
    title="Revora Analytics API",
    description="Serves live quest and escalation data from Revora.db",
    version="1.0.0",
)

# Allow the frontend (any origin) to call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Ensure DB tables exist before serving."""
    init_quest()
    init_escalations()


@app.get("/api/quest-state")
async def quest_state():
    """Return the full quest state computed live from SQLite."""
    return get_state()


@app.get("/api/escalations")
async def escalations():
    """Return all escalations from SQLite."""
    data = list_escalations(status=None)
    return {"escalations": data}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "revora-analytics"}


if __name__ == "__main__":
    port = int(os.getenv("ANALYTICS_PORT", "8082"))
    print(f"\n[REVORA] Analytics API starting on http://localhost:{port}")
    print(f"   GET /api/quest-state   - live quest data")
    print(f"   GET /api/escalations   - escalation tickets")
    print(f"   GET /health            - health check\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
