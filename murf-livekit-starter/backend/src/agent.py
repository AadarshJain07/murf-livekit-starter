import logging

from dotenv import load_dotenv
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    room_io,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from memory import get_user_memory, save_user_memory
from outbound import (
    OutboundCallError,
    OutboundJob,
    dial,
    log_event,
    parse_outbound_job,
)
from outbound_prompt import build_outbound_opening, build_outbound_system_prompt
from prompt import GREETING_PROMPT, SYSTEM_PROMPT

logger = logging.getLogger("agent")

load_dotenv(".env.local")


class Assistant(Agent):
    def __init__(
        self,
        user_id: str,
        instructions: str = SYSTEM_PROMPT,
        ctx: JobContext | None = None,
        outbound: bool = False,
    ) -> None:
        self.user_id = user_id
        # Only set for outbound phone calls; the browser session ignores these.
        self.ctx = ctx
        self.outbound = outbound

        super().__init__(
            instructions=instructions,
        )

    @function_tool
    async def remember_student(
        self,
        context: RunContext,
        name: str,
        consent: bool,
        language_preference: str = "",
        current_level: str = "",
        topics_covered: str = "",
        common_mistakes: str = "",
    ) -> str:
        """Save student information only after explicit consent."""

        if not consent:
            return (
                "The student did not give permission. "
                "Do not save their information."
            )

        save_user_memory(
            user_id=self.user_id,
            name=name,
            language_preference=language_preference,
            current_level=current_level,
            topics_covered=topics_covered,
            common_mistakes=common_mistakes,
        )

        return "Student memory saved successfully."

    @function_tool
    async def get_next_exercise(
        self,
        context: RunContext,
        subject: str,
        level: str = "Class 11",
    ) -> str:
        """
        Fetch the next practice exercise for a student.
        Uses the local Learning & Literacy dataset.
        """

        if self.outbound:
            log_event("exercise requested", subject=subject, level=level)

        exercises = {
            "physics": {
                "topic": "Newton's Laws",
                "question": (
                    "A 5 kg object is acted upon by a net force of 20 N. "
                    "What is its acceleration?"
                ),
                "answer": "4 m/s²",
            },
            "chemistry": {
                "topic": "Mole Concept",
                "question": (
                    "How many moles are present in 18 grams of water?"
                ),
                "answer": "1 mole",
            },
            "maths": {
                "topic": "Quadratic Equations",
                "question": (
                    "Find the roots of x² - 5x + 6 = 0."
                ),
                "answer": "2 and 3",
            },
            "biology": {
                "topic": "Cell Biology",
                "question": (
                    "Which organelle is known as the powerhouse of the cell?"
                ),
                "answer": "Mitochondria",
            },
        }

        key = subject.lower().strip()
        if key in ("mathematics", "math"):
            key = "maths"

        if key not in exercises:
            if self.outbound:
                log_event("exercise tool failed", subject=subject, reason="unsupported")
            return (
                f"I don't currently have an exercise dataset for {subject}. "
                "Please choose Physics, Chemistry, Maths, or Biology."
            )

        exercise = exercises[key]

        if self.outbound:
            log_event(
                "exercise returned", subject=subject, topic=exercise["topic"]
            )

        return (
            f"Topic: {exercise['topic']}\n"
            f"Question: {exercise['question']}\n"
            f"Expected answer: {exercise['answer']}"
        )

    @function_tool
    async def end_call(
        self,
        context: RunContext,
        reason: str = "completed",
    ) -> str:
        """
        End the current outbound phone call politely.
        Use after an opt-out request, after the practice session is finished,
        or when the exercise service is unavailable.
        """

        if not self.outbound or self.ctx is None:
            return "There is no phone call to end. Continue the conversation."

        normalized = reason.lower()
        if any(k in normalized for k in ("opt", "stop", "unsubscribe", "no more")):
            log_event("learner opted out")
        else:
            log_event("call completed", reason=reason)

        # Let the closing sentence finish playing before hanging up.
        speech = getattr(context.session, "current_speech", None)
        if speech is not None:
            try:
                await speech.wait_for_playout()
            except Exception:  # noqa: BLE001 - hanging up regardless
                pass
        await self.ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=self.ctx.room.name)
        )
        return "Call ended."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


def build_session(ctx: JobContext) -> AgentSession:
    """Shared voice pipeline: Deepgram STT -> Gemini -> Murf Falcon TTS."""
    return AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
        ),
        llm=google.LLM(
            model="gemini-3.5-flash-lite",
        ),
        tts=murf.TTS(
            voice="anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(
                min_sentence_len=2
            ),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=False,
    )


async def run_outbound_call(ctx: JobContext, job: OutboundJob) -> None:
    """Scheduled daily practice call over LiveKit SIP."""

    await ctx.connect()

    session = build_session(ctx)

    @session.on("user_input_transcribed")
    def _on_user_speech(ev):
        if getattr(ev, "is_final", False):
            log_event("learner answered", text=ev.transcript)

    assistant = Assistant(
        user_id=job.user_id,
        instructions=build_outbound_system_prompt(
            participant_name=job.participant_name,
            subject=job.subject,
            level=job.level,
            call_type="scheduled study reminder",
        ),
        ctx=ctx,
        outbound=True,
    )

    try:
        await dial(ctx, job)
    except OutboundCallError as e:
        # No answer / busy / voicemail / SIP failure — never fail silently.
        logger.error("Outbound call could not be completed: %s", e)
        await ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=ctx.room.name)
        )
        return

    await session.start(agent=assistant, room=ctx.room)

    # Proactive study reminder: say who is calling, why, and how to stop.
    await session.generate_reply(
        instructions=(
            "Open the call with this reminder, keeping the meaning and the "
            "opt-out instruction intact, then stop and listen: "
            + build_outbound_opening(
                participant_name=job.participant_name,
                subject=job.subject,
            )
        )
    )


async def run_browser_session(ctx: JobContext) -> None:
    """Existing browser conversation — unchanged behaviour."""

    # Stable demo user ID.
    user_id = "demo-student-001"

    logger.info(
        f"Using persistent user ID: {user_id}"
    )

    session = build_session(ctx)

    assistant = Assistant(user_id)

    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    await ctx.connect()

    # Read memory directly from the database.
    # This avoids triggering a Gemini function call during startup.
    memory = get_user_memory(user_id)

    if memory:
        name = memory.get("name", "")
        topics = memory.get("topics_covered", "")

        if name and topics:
            greeting = (
                f"Welcome back, {name}! "
                f"Last time we were working on {topics}. "
                "Would you like to continue?"
            )

        elif name:
            greeting = (
                f"Welcome back, {name}! "
                "What would you like to learn today?"
            )

        else:
            greeting = GREETING_PROMPT

    else:
        greeting = GREETING_PROMPT

    await session.generate_reply(
        instructions=greeting
    )


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):

    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Outbound jobs carry dial details in the job metadata; browser jobs don't.
    try:
        outbound_job = parse_outbound_job(ctx.job.metadata)
    except RuntimeError as e:
        logger.error("Outbound job rejected: %s", e)
        return

    if outbound_job is not None:
        await run_outbound_call(ctx, outbound_job)
    else:
        await run_browser_session(ctx)


if __name__ == "__main__":
    cli.run_app(server)
