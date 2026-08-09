import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from prompt import SYSTEM_PROMPT, GREETING_PROMPT
from memory import get_user_memory, save_user_memory

logger = logging.getLogger("agent")

load_dotenv(".env.local")


class Assistant(Agent):
    def __init__(self, user_id: str) -> None:
        self.user_id = user_id

        super().__init__(
            instructions=SYSTEM_PROMPT,
        )

    @function_tool
    async def lookup_memory(
        self,
        context: RunContext,
    ) -> str:
        """Look up the current student's saved learning information."""

        memory = get_user_memory(self.user_id)

        if not memory:
            return "No saved memory was found for this student."

        return str(memory)

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


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):

    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Stable demo user ID.
    # This allows multiple calls to access the same memory record.
    user_id = "demo-student-001"

    logger.info(f"Using persistent user ID: {user_id}")

    session = AgentSession(
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
        preemptive_generation=True,
    )

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

    # Start with the normal greeting.
    # The agent can use lookup_memory when it needs
    # the student's saved learning context.
    await session.generate_reply(
        instructions=GREETING_PROMPT
    )


if __name__ == "__main__":
    cli.run_app(server)