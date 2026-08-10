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
