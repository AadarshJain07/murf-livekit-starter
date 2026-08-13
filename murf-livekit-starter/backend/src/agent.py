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

from escalations import create_escalation as store_escalation
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

from quest import (
    start_session,
    record_attempt,
    end_session,
    get_state,
    build_boss_plan,
)

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
    async def start_quest(
        self,
        context: RunContext,
        subject: str = "Physics",
        topic: str = "Kinematics",
        difficulty: str = "easy",
    ) -> str:
        """
        Start a Revora Voice Quest for the student.

        Creates a real quest session and returns the session ID.
        The model should then generate the first learning challenge.
        """

        try:
            session = start_session(
                user_id=self.user_id,
                subject=subject,
                topic=topic,
                channel="browser" if not self.outbound else "sip",
            )

            state = get_state(self.user_id)

            return (
                f"Quest started successfully. "
                f"Session ID: {session['session_id']}. "
                f"Subject: {session['subject']}. "
                f"Topic: {session['topic']}. "
                f"Starting difficulty: {difficulty}. "
                f"Current XP: {state['xp']}. "
                f"Current level: {state['level']}. "
                "Now present the first challenge as a short voice question."
            )

        except Exception as error:
            logger.error("Could not start quest: %s", error)
            return (
                "The quest could not be started. "
                "Do not pretend that a quest has started. "
                "Continue with normal tutoring."
            )

    @function_tool
    async def record_quest_answer(
        self,
        context: RunContext,
        subject: str,
        topic: str,
        concept: str,
        correct: bool,
        difficulty: str = "medium",
        attempts: int = 1,
        session_id: str = "",
    ) -> str:
        """
        Record one answer during a Voice Quest.

        The tool calculates XP, damage, mastery and the next difficulty.
        """

        try:
            result = record_attempt(
                user_id=self.user_id,
                session_id=session_id,
                subject=subject,
                topic=topic,
                concept=concept,
                correct=correct,
                difficulty=difficulty,
                attempts=attempts,
                kind="question",
            )

            if result["correct"]:
                return (
                    f"Correct answer recorded. "
                    f"XP awarded: {result['xp_awarded']}. "
                    f"Damage dealt: {result['damage']}. "
                    f"Topic mastery: {result['topic_mastery']}%. "
                    f"Total XP: {result['total_xp']}. "
                    f"Level: {result['level']}. "
                    f"Next difficulty: {result['next_difficulty']}. "
                    "Narrate this as a successful attack and continue."
                )

            return (
                f"Incorrect answer recorded. "
                f"XP awarded: {result['xp_awarded']}. "
                f"Damage dealt: {result['damage']}. "
                f"Next difficulty: {result['next_difficulty']}. "
                f"Hint recommended: {result['should_hint']}. "
                "Narrate that the attack was blocked, give a useful hint, "
                "and let the student retry."
            )

        except Exception as error:
            logger.error("Could not record quest answer: %s", error)
            return (
                "The answer could not be recorded. "
                "Do not claim XP or damage was awarded. "
                "Continue helping the student normally."
            )

    @function_tool
    async def boss_battle(
        self,
        context: RunContext,
        subject: str = "Physics",
    ) -> str:
        """
        Prepare a boss battle using the student's real learning history.

        The boss plan contains the historical weak concepts and learned topics.
        """

        try:
            plan = build_boss_plan(
                user_id=self.user_id,
                subject=subject,
            )

            if not plan["unlocked"]:
                return (
                    f"The {plan['subject']} boss is not unlocked yet. "
                    "Do not start a boss battle. "
                    f"Current player level: {plan['level']}. "
                    "Continue with normal quests and mastery practice."
                )

            weak_concepts = plan.get("target_weak_concepts") or []
            learned_topics = plan.get("topics_learned") or []

            return (
                f"BOSS BATTLE UNLOCKED. "
                f"Boss: {plan['boss']}. "
                f"Subject: {plan['subject']}. "
                f"Player level: {plan['level']}. "
                f"Historical weak concepts: {', '.join(weak_concepts) if weak_concepts else 'none recorded'}. "
                f"Previously learned topics: {', '.join(learned_topics) if learned_topics else 'none recorded'}. "
                "Create a challenging but fair question using the real history above. "
                "Do not invent weaknesses."
            )

        except Exception as error:
            logger.error("Could not prepare boss battle: %s", error)
            return (
                "The boss battle could not be loaded. "
                "Do not claim that it has started."
            )

    @function_tool
    async def record_teach_back(
        self,
        context: RunContext,
        subject: str,
        topic: str,
        concept: str,
        correct: bool,
        session_id: str = "",
    ) -> str:
        """
        Record the student's final teach-back attack.

        Only mark it successful when the student's explanation actually
        demonstrates understanding.
        """

        try:
            result = record_attempt(
                user_id=self.user_id,
                session_id=session_id,
                subject=subject,
                topic=topic,
                concept=concept,
                correct=correct,
                difficulty="hard",
                attempts=1,
                kind="teach_back",
            )

            if result["correct"]:
                return (
                    f"Teach-back successful. "
                    f"Final attack damage: {result['damage']}. "
                    f"XP awarded: {result['xp_awarded']}. "
                    f"Total XP: {result['total_xp']}. "
                    f"Level: {result['level']}. "
                    "Narrate the final attack landing."
                )

            return (
                f"Teach-back was not sufficient. "
                f"XP awarded: {result['xp_awarded']}. "
                "Explain the missing concept clearly and let the student "
                "try the teach-back again."
            )

        except Exception as error:
            logger.error("Could not record teach-back: %s", error)
            return (
                "The teach-back could not be recorded. "
                "Do not claim that the final attack succeeded."
            )

    @function_tool
    async def complete_quest(
        self,
        context: RunContext,
        session_id: str = "",
        success: bool = True,
        subject: str = "",
        topic: str = "",
    ) -> str:
        """
        Complete a Voice Quest and record its real success/failure outcome.
        """

        try:
            outcome = "success" if success else "failed"

            result = end_session(
                user_id=self.user_id,
                session_id=session_id,
                outcome=outcome,
                subject=subject,
                topic=topic,
            )

            if not result.get("ok"):
                return (
                    "The quest could not be completed because there is "
                    "no open quest session. Do not claim completion."
                )

            if result["outcome"] == "success":
                return (
                    f"Quest completed successfully. "
                    f"Session ID: {result['session_id']}. "
                    f"Completion bonus XP: {result['bonus_xp']}. "
                    f"Total XP: {result['total_xp']}. "
                    f"Level: {result['level']}. "
                    "Congratulate the student and report only these real values."
                )

            return (
                f"Quest recorded as failed/incomplete. "
                f"Session ID: {result['session_id']}. "
                f"Total XP: {result['total_xp']}. "
                f"Level: {result['level']}. "
                "Do not present this as a completed successful quest."
            )

        except Exception as error:
            logger.error("Could not complete quest: %s", error)
            return (
                "The quest outcome could not be recorded. "
                "Do not claim success or failure as a confirmed database result."
            )

    @function_tool
    async def get_quest_progress(
        self,
        context: RunContext,
    ) -> str:
        """
        Read the student's current real Voice Quest progress.
        """

        try:
            state = get_state(self.user_id)

            sessions = state["sessions"]

            return (
                f"Quest progress: "
                f"Level {state['level']}, "
                f"{state['xp']} XP, "
                f"{state['streak']}-day streak, "
                f"{sessions['total']} total sessions, "
                f"{sessions['successful']} successful, "
                f"{sessions['failed']} failed, "
                f"{sessions['success_rate']}% success rate, "
                f"{state['overall_mastery']}% overall mastery. "
                f"Weak concepts: "
                f"{', '.join(w['concept'] for w in state['weaknesses']) if state['weaknesses'] else 'none identified'}. "
                f"Next quest: {state['next_quest']['title']} — "
                f"{state['next_quest']['reason']}"
            )

        except Exception as error:
            logger.error("Could not read quest progress: %s", error)
            return (
                "Quest progress is temporarily unavailable. "
                "Do not invent progress values."
            )
    @function_tool
    async def create_escalation(
        self,
        context: RunContext,
        consent: bool,
        reason: str,
        topic: str,
        tried: str,
        urgency: str = "medium",
        language_preference: str = "English",
        follow_up_method: str = "in-app message",
        student: str = "",
        phone_number: str = "",
    ) -> str:
        """
        Raise a support request so a human teacher can help this student.

        Only call this after you explained that a teacher can help AND the
        student clearly agreed to share a short summary (consent=True).
        If the student asks for a phone call ("call me"), ask for their phone number
        and pass it in phone_number with follow_up_method="phone call".
        Never include passwords, OTPs, PINs, account numbers or any other
        private information in the summary fields.
        """

        if not consent:
            return (
                "The student has not agreed to share a summary with a teacher. "
                "Do not create a request and continue helping normally."
            )

        student_label = student.strip()
        if not student_label:
            memory = get_user_memory(self.user_id)
            if memory and memory.get("name"):
                student_label = memory["name"]
            else:
                student_label = self.user_id

        try:
            record = store_escalation(
                student=student_label,
                reason=reason,
                topic=topic,
                tried=tried,
                urgency=urgency,
                language_preference=language_preference,
                follow_up_method=follow_up_method,
                phone_number=phone_number,
            )
        except Exception as e:  # noqa: BLE001 - never crash the voice session
            logger.error("Escalation could not be saved: %s", e)
            return (
                "The support system is temporarily unavailable, so no request "
                "was created. Tell the student honestly and keep helping them."
            )

        logger.info(
            "Escalation created: %s (urgency=%s, topic=%s)",
            record["reference_id"],
            record["urgency"],
            record["topic"],
        )

        return (
            f"Escalation created with reference ID {record['reference_id']} "
            f"and status open. Tell the student the reference ID, that a "
            f"teacher can review it through the support system, and that you "
            f"cannot promise an immediate response. Do not claim a teacher has "
            f"already reviewed it. Then continue helping the student."
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
