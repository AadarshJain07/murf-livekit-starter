# PrepPilot AI

A voice-first AI tutor built for Indian students. Explain concepts, revise lessons, and take quizzes — all through natural voice conversations in English, Hindi, or Hinglish.

## Features

* **Voice-first tutoring** — Talk naturally and listen to answers powered by Murf Falcon + LiveKit.
* **Multilingual support** — English, Hindi, and Hinglish.
* **Concept explanations** — Ask any topic and get clear, student-friendly answers.
* **Quiz mode** — Interactive spoken quizzes with encouraging feedback.
* **Revision help** — Quickly recap lessons before exams.
* **Learning exercises** — Fetch subject-specific practice questions through a dedicated learning tool.
* **Student memory** — Remember learning-related information with explicit student consent.
* **Safety guardrails** — No exam cheating, no full homework completion, and no shaming students for wrong answers.

## Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, LiveKit Client
* **Backend:** Python, LiveKit Agents, Murf Falcon, Deepgram, Gemini

## Project Structure

```text
.
├── src/                          # Web application
│   ├── routes/                   # Application routes
│   ├── components/preppilot/     # PrepPilot UI components
│   ├── hooks/                    # LiveKit and voice hooks
│   └── lib/                      # Utilities
├── murf-livekit-starter/backend/ # Python voice agent
│   └── src/
│       ├── agent.py              # LiveKit agent entry
│       ├── prompt.py             # System prompt, greeting, guardrails
│       ├── memory.py             # Student memory
│       └── ...
└── RED_TEAM.md                   # Adversarial test prompts
```

## Getting Started

### Prerequisites

* Python 3.10+
* `uv`
* LiveKit Cloud project
* Murf API key
* Deepgram API key
* Gemini API key

### How the pieces connect

```text
Web App
   |
   | joins LiveKit room
   v
LiveKit Cloud
   |
   v
Python Voice Agent
   |
   +---- Deepgram STT
   |
   +---- Gemini LLM
   |
   +---- Murf Falcon TTS
   |
   +---- Learning & Memory Tools
```

The Python agent connects to LiveKit Cloud, so it can run from your laptop without port forwarding. The tutor responds while the backend agent process is running.

## Backend Setup

Navigate to the backend:

```bash
cd murf-livekit-starter/backend
```

Create your environment file:

```bash
cp .env.local.example .env.local
```

Add your required API keys and LiveKit configuration to `.env.local`.

Install dependencies:

```bash
uv sync
```

Download required files on the first run:

```bash
uv run python src/agent.py download-files
```

## Run the Agent

Start the LiveKit agent:

```bash
uv run python src/agent.py dev
```

Keep this process running while using the web application.

## Demo Runbook

1. Start the Python agent.

2. Open the PrepPilot web application.

3. Click **Start Conversation**.

4. Allow microphone access.

5. Ask PrepPilot a question.

6. Try a practice request such as:

   > "Give me a Class 11 Physics practice question."

7. The agent should automatically call the learning exercise tool and return a practice question.

## Day 5 — Learning Exercise Tool

PrepPilot includes a `get_next_exercise` function tool for the Learning & Literacy track.

The tool currently uses a **local hand-built dataset** containing practice exercises for:

* Physics
* Chemistry
* Mathematics
* Biology

Example request:

```text
"Give me a Physics practice question."
```

The agent decides when to call the tool based on the student's request and then presents the returned exercise naturally through voice.

### Data Source

**Source:** Local hand-built dataset.

**Status:** Local/static data, not a live external API.

This approach is used for the Day 5 prototype so the agent can demonstrate reliable function calling and graceful handling of unsupported subjects without depending on an external service.

## Day 6 - Outbound Calls

### Outbound use case: Scheduled Daily Practice Call

PrepPilot AI calls the learner at the practice time they selected, explains why
it is calling, offers an easy opt-out, and — if the learner agrees — asks one
Class 11 practice question fetched through the existing `get_next_exercise`
tool. Voice is generated in real time with **Murf Falcon TTS**, speech is
transcribed with Deepgram, and reasoning runs on Gemini.

### Why this matters for Learning & Literacy

Many Indian students never open a study app on a busy day. A short, spoken,
one-question practice call removes every barrier: no app, no typing, no data
plan — just a phone ringing at the time the learner chose. Daily spaced
practice is one of the strongest drivers of retention, and voice works for
learners with low reading confidence too.

### Call flow

```text
1. call initiated        -> agent asks LiveKit SIP to dial the learner
2. call connected        -> learner picks up
3. opening               -> "Hi, this is PrepPilot AI, your learning assistant..."
                            reason for calling + "say 'stop calls' to end"
4. consent question      -> "Would you like today's quick practice question?"
5a. opt-out              -> polite acknowledgement, call ends immediately
5b. agreement            -> get_next_exercise(subject="Physics", level="Class 11")
6. question spoken       -> Murf Falcon speaks it naturally (never raw tool output)
7. learner answers       -> Deepgram transcribes, Gemini gives short feedback
8. call completed        -> agent thanks the learner and hangs up
```

### SIP / telephony architecture

```text
Browser:   Frontend -> LiveKit -> PrepPilot Agent            (Day 1-5, unchanged)
Outbound:  PrepPilot Agent -> LiveKit SIP -> SIP/Linphone endpoint -> phone
```

The same agent process handles both. A LiveKit job that carries outbound
metadata becomes a practice call; a job without metadata is the normal browser
session.

New/changed backend files:

```text
src/outbound.py          # SIP dialing, failure mapping, call-outcome logging
src/outbound_prompt.py   # outbound opening, opt-out rules, practice flow
src/make_call.py         # CLI to trigger an outbound call
src/agent.py             # browser vs outbound branch + end_call tool
```

### Linphone setup (no PSTN / no Twilio needed)

1. Install [Linphone](https://www.linphone.org/) on your phone or desktop.
2. Create a free SIP account (e.g. `sip.linphone.org`) and sign in.
3. In LiveKit Cloud open **Telephony -> Trunks -> Create outbound trunk**,
   point it at your SIP provider (`sip.linphone.org`) and set the trunk's
   auth username/password to your SIP credentials.
4. Copy the trunk ID (`ST_...`) into `SIP_OUTBOUND_TRUNK_ID`.
5. Call your own Linphone address, e.g. `sip:yourname@sip.linphone.org`.

With a PSTN-capable trunk the same command works with a real number
(`+919876543210`).

### Required environment variables

`murf-livekit-starter/backend/.env.local` (template: `.env.local.example`):

```bash
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

MURF_API_KEY=
DEEPGRAM_API_KEY=
GOOGLE_API_KEY=

SIP_OUTBOUND_TRUNK_ID=
SIP_USERNAME=
SIP_PASSWORD=
AGENT_NAME=my-agent
```

No credentials are hard-coded anywhere in the source.

### Start the agent

```bash
cd murf-livekit-starter/backend
uv sync
uv run python src/agent.py dev
```

### Trigger an outbound test call

In a second terminal:

```bash
cd murf-livekit-starter/backend
uv run python src/make_call.py sip:yourname@sip.linphone.org
# or a real number:
uv run python src/make_call.py +919876543210
# optional overrides:
uv run python src/make_call.py +919876543210 --subject Chemistry --level "Class 11"
```

The terminal prints `Starting outbound call...` and the agent terminal shows
`[OUTBOUND]` events plus `executing tool: get_next_exercise`.

### Testing checklist

| Scenario | How to test | Expected |
| --- | --- | --- |
| Happy path | Answer, say "Yes, give me today's question" | `exercise requested` -> `exercise returned`, question spoken, feedback, `call completed` |
| Opt-out | Say "stop calls" / "don't call me" / "unsubscribe" | "Got it. I won't continue this practice call." then `learner opted out` and hangup |
| Decline today | Say "not now" | Polite sign-off, call ends |
| No answer | Let it ring out, or keep Linphone offline | `no answer` logged, room closed, no crash |
| Busy | Reject the call in Linphone | `busy` or `call declined` logged |
| Voicemail / instant hang-up | Hang up right after connecting | `call completed` / participant disconnect handled cleanly |
| Exercise tool failure | Ask for an unsupported subject (e.g. History) | "couldn't load today's practice question" - never an invented question |
| SIP misconfiguration | Unset `SIP_OUTBOUND_TRUNK_ID` | Clear error, browser flow still works |
| Day 1-5 regression | Open the web app and click Start Conversation | Browser session, memory and `get_next_exercise` all still work |

### Call outcome logging

Every outbound call logs readable events: `call initiated`, `call connected`,
`learner answered`, `learner opted out`, `exercise requested`,
`exercise returned`, `exercise tool failed`, `call completed`, `no answer`,
`busy`, `call declined`, `call failed`.

The outbound call is always a **scheduled daily practice session** the learner
opted into — never an unsolicited marketing call. Murf Falcon keeps the spoken
turns fast and natural enough for a real-time phone conversation.

## Development

Start the agent in development mode:

```bash
uv run python src/agent.py dev
```

The main backend files are:

```text
src/
├── agent.py
├── prompt.py
├── memory.py
└── ...
```

## License

This project is built for hackathon and educational use.
