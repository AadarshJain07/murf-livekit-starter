# PrepPilot AI

A voice-first AI tutor built for Indian students. Explain concepts, revise lessons, and take quizzes — all through natural voice conversations in English, Hindi, or Hinglish.

## Features

- **Voice-first tutoring** — Talk naturally, listen to answers powered by Murf Falcon + LiveKit.
- **Multilingual support** — English, Hindi, and Hinglish.
- **Concept explanations** — Ask any topic and get clear, student-friendly answers.
- **Quiz mode** — Interactive spoken quizzes with encouraging feedback.
- **Revision help** — Quickly recap lessons before exams.
- **Safety guardrails** — No exam cheating, no full homework completion, no shaming wrong answers.

## Tech Stack

- **Frontend:** TanStack Start, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, LiveKit Client
- **Backend:** Python, LiveKit Agents, Murf Falcon, Deepgram, Gemini

## Project Structure

```
.
├── src/                          # TanStack Start web app
│   ├── routes/                   # Application routes
│   ├── components/preppilot/     # PrepPilot UI components
│   ├── hooks/                    # LiveKit and voice hooks
│   └── lib/                      # Utilities
├── murf-livekit-starter/backend/ # Python voice agent
│   └── src/
│       ├── agent.py              # LiveKit agent entry
│       ├── prompt.py             # SYSTEM_PROMPT, greeting, guardrail tests
│       └── ...
└── RED_TEAM.md                   # Adversarial test prompts
```

## Getting Started

### Prerequisites

- Node.js + Bun
- Python 3.10+ + uv
- LiveKit Cloud project
- Murf, Deepgram, and Gemini API keys

### How the pieces connect

```text
Browser (web app) --token--> /api/livekit-token  (LiveKit keys)
       |                            |
       +------- joins room ---------+
                    |
            LiveKit Cloud room
                    |
      Python agent (Murf + Deepgram + Gemini)
```

The agent connects out to LiveKit Cloud, so it works from your laptop with no
port forwarding — but the tutor only replies while that process is running.
For an always-on setup, deploy the same backend to LiveKit Cloud Agents or
Railway; no code changes are needed.

### 1. Frontend

Create a `.env.local` in the project root:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
AGENT_NAME=my-agent
```

`AGENT_NAME` must match `agent_name` in `murf-livekit-starter/backend/src/agent.py`
(`my-agent` by default) so each room explicitly dispatches your agent.

Install and run:

```bash
bun install
bun dev
```

Open [http://localhost:8080](http://localhost:8080).

### 2. Backend

Copy the template and fill in all six keys:

```bash
cd murf-livekit-starter/backend
cp .env.local.example .env.local
```

Run the agent:

```bash
uv sync
uv run python src/agent.py download-files   # first run only
uv run python src/agent.py dev
```

## Demo runbook (two terminals)

```bash
# Terminal 1 — the tutor's brain
cd murf-livekit-starter/backend && uv run python src/agent.py dev

# Terminal 2 — the web app
bun dev
```

1. Open the web app, click **Start Conversation**, allow microphone access.
2. Speak, or tap a suggested prompt card, or type in the chat composer.
3. If the app connects but nothing answers, the UI shows a
   "Tutor isn't online yet" hint — start the agent in Terminal 1 and reconnect.


## Development Scripts

```bash
bun dev      # Start the dev server
bun build    # Production build
bun lint     # Run ESLint
bun format   # Format with Prettier
```

## License

This project is built for hackathon and educational use.
