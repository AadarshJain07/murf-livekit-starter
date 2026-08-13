"""Trigger a Revora AI outbound daily practice call.

Usage:
    uv run python src/make_call.py +919876543210
    uv run python src/make_call.py sip:learner@127.0.0.1 --subject Chemistry

The agent worker (`uv run python src/agent.py dev`) must already be running.
This script only dispatches a job; the agent places the SIP call.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import uuid

from dotenv import load_dotenv
from livekit import api

load_dotenv(".env.local")

AGENT_NAME = os.getenv("AGENT_NAME", "my-agent")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Place a Revora practice call")
    parser.add_argument("to", help="Phone number (+91...) or SIP URI to call")
    parser.add_argument("--subject", default="Physics")
    parser.add_argument("--level", default="Class 11")
    parser.add_argument("--user-id", default="demo-student-001")
    parser.add_argument("--name", default="learner")
    args = parser.parse_args()

    for var in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"):
        if not os.getenv(var):
            raise SystemExit(f"Missing {var} in .env.local")
    if not os.getenv("SIP_OUTBOUND_TRUNK_ID"):
        raise SystemExit("Missing SIP_OUTBOUND_TRUNK_ID in .env.local")

    room_name = f"Revora-outbound-{uuid.uuid4().hex[:8]}"
    metadata = json.dumps(
        {
            "sip_call_to": args.to,
            "participant_name": args.name,
            "user_id": args.user_id,
            "subject": args.subject,
            "level": args.level,
        }
    )

    print(f"Starting outbound call... to={args.to} room={room_name}")

    lkapi = api.LiveKitAPI()
    try:
        dispatch = await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=AGENT_NAME,
                room=room_name,
                metadata=metadata,
            )
        )
        print(f"Dispatched job {dispatch.id} to agent '{AGENT_NAME}'.")
        print("Watch the agent terminal for [OUTBOUND] call outcome logs.")
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(main())
