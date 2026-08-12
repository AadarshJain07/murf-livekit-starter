"""Outbound (SIP telephony) support for Revora AI.

Architecture
    Browser:  Frontend -> LiveKit -> Revora Agent          (unchanged)
    Outbound: Revora Agent -> LiveKit SIP -> SIP/Linphone -> phone

All SIP configuration comes from environment variables. Nothing is
hard-coded.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

from livekit import api
from livekit.agents import JobContext

logger = logging.getLogger("Revora.outbound")


# --- call outcome logging -------------------------------------------------

def log_event(event: str, **fields: object) -> None:
    """Readable, greppable call-outcome logs for the Day 6 demo."""
    extra = " ".join(f"{k}={v}" for k, v in fields.items() if v not in (None, ""))
    logger.info("[OUTBOUND] %s%s", event, f" | {extra}" if extra else "")


@dataclass
class OutboundJob:
    """Parsed outbound dial request coming from the job metadata."""

    sip_call_to: str
    trunk_id: str
    participant_name: str = "learner"
    user_id: str = "demo-student-001"
    subject: str = "Physics"
    level: str = "Class 11"


def parse_outbound_job(metadata: str | None) -> OutboundJob | None:
    """Return an OutboundJob when this LiveKit job is an outbound call.

    Metadata may be a JSON object or a bare phone/SIP URI string. Anything
    else (including empty metadata from the browser flow) returns None so the
    existing browser session behaviour is untouched.
    """
    if not metadata or not metadata.strip():
        return None

    raw = metadata.strip()
    data: dict[str, object]
    if raw.startswith("{"):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("[OUTBOUND] ignoring unparsable job metadata")
            return None
        if not isinstance(parsed, dict):
            return None
        data = parsed
    else:
        data = {"sip_call_to": raw}

    sip_call_to = str(data.get("sip_call_to") or data.get("phone_number") or "")
    if not sip_call_to:
        return None

    trunk_id = str(data.get("trunk_id") or os.getenv("SIP_OUTBOUND_TRUNK_ID", ""))
    if not trunk_id:
        raise RuntimeError(
            "SIP_OUTBOUND_TRUNK_ID is not set — cannot place an outbound call."
        )

    return OutboundJob(
        sip_call_to=sip_call_to,
        trunk_id=trunk_id,
        participant_name=str(data.get("participant_name") or "learner"),
        user_id=str(data.get("user_id") or "demo-student-001"),
        subject=str(data.get("subject") or "Physics"),
        level=str(data.get("level") or "Class 11"),
    )


class OutboundCallError(RuntimeError):
    """Raised when the call could not be connected (no answer, busy, ...)."""


# SIP status codes -> human readable outcome for the terminal demo.
_SIP_OUTCOMES = {
    "486": "busy",
    "600": "busy",
    "480": "no answer",
    "408": "no answer (timeout)",
    "487": "cancelled / no answer",
    "603": "call declined",
    "404": "number not found",
    "503": "SIP service unavailable",
}


async def dial(ctx: JobContext, job: OutboundJob) -> api.SIPParticipantInfo:
    """Place the outbound SIP call and wait until the learner answers."""
    log_event("call initiated", to=job.sip_call_to, room=ctx.room.name)

    try:
        participant = await ctx.api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=job.trunk_id,
                sip_call_to=job.sip_call_to,
                participant_identity=job.sip_call_to,
                participant_name=job.participant_name,
                wait_until_answered=True,
            )
        )
    except api.TwirpError as e:
        status = (e.metadata or {}).get("sip_status_code", "")
        outcome = _SIP_OUTCOMES.get(str(status), "call failed")
        log_event(
            outcome,
            to=job.sip_call_to,
            sip_status=status,
            sip_status_text=(e.metadata or {}).get("sip_status", ""),
            error=e.message,
        )
        raise OutboundCallError(f"{outcome}: {e.message}") from e
    except Exception as e:  # SIP config errors, transport errors, ...
        log_event("call failed", to=job.sip_call_to, error=repr(e))
        raise OutboundCallError(f"SIP connection failure: {e}") from e

    log_event("call connected", to=job.sip_call_to, participant=participant.identity)
    return participant
