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

### 1. Frontend

Create a `.env.local` in the project root:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
AGENT_NAME=preppilot-agent
```

Install and run:

```bash
bun install
bun dev
```

Open [http://localhost:8080](http://localhost:8080).

### 2. Backend

Create `murf-livekit-starter/backend/.env.local`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
MURF_API_KEY=your-murf-key
DEEPGRAM_API_KEY=your-deepgram-key
GOOGLE_API_KEY=your-gemini-key
```

Run the agent:

```bash
cd murf-livekit-starter/backend
uv sync
uv run python src/agent.py dev
```

## Usage

1. Open the frontend in your browser.
2. Click **Start Conversation** and allow microphone access.
3. Speak or tap a suggested prompt card to begin learning.

## Development Scripts

```bash
bun dev      # Start the dev server
bun build    # Production build
bun lint     # Run ESLint
bun format   # Format with Prettier
```

## License

This project is built for hackathon and educational use.
