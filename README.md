# Revora — Multi-Specialist Voice Learning Assistant

Revora is an AI-powered voice learning platform and combat-style revision coach for Class 11 students. It features an intelligent **Multi-Specialist Learning Router** that dynamically routes student queries to dedicated subject specialists (Maths, Physics, Chemistry) with zero context loss and returns structured learning summaries for targeted remediation.

---

## Architecture Overview

```
                          ┌──────────────────────┐
                          │   Student Speaks     │
                          └──────────┬───────────┘
                                     │ (LiveKit Voice Stream)
                                     ▼
                          ┌──────────────────────┐
                          │    Revora Router     │
                          │     (Main Agent)     │
                          └──────────┬───────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │ (Maths Request)           │ (Physics Request)         │ (Chemistry Request)
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Maths Specialist │       │Physics Specialist│       │Chem Specialist   │
│  - Algebra       │       │ - Kinematics     │       │ - Atomic Struct  │
│  - Calculus      │       │ - Dynamics       │       │ - Bonding        │
│  - Trigonometry  │       │ - Gravitation    │       │ - Mole Concept   │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │ return_to_revora(summary)
                                    ▼
                          ┌──────────────────────┐
                          │ Structured Remediation│
                          │ & Targeted Quests    │
                          └──────────────────────┘
```

---

## Core Features

- **Multi-Specialist Learning Router**: Autonomous domain detection and zero-repetition handoffs between Revora and specialized tutors.
- **Voice Quests & Boss Battles**: Gamified revision sessions with real-time XP calculation, dynamic difficulty adaptation, and teach-back challenges.
- **Persistent Student Memory**: Stores student preferences, past performance, and common misconceptions safely in Supabase PostgreSQL.
- **Adaptive Mastery Tracking**: Per-topic accuracy tracking and weak-concept detection to guide personalized next quests.
- **Low-Latency Voice Engine**: Powered by Murf Falcon TTS, Deepgram Nova-3 STT, and Google Gemini.

---

## Tech Stack

- **Frontend**: TanStack Start / React, TypeScript, Tailwind CSS, Lucide Icons
- **Voice Pipeline**: LiveKit Agents Python SDK, Murf Falcon TTS, Deepgram Nova-3, Google Gemini
- **Database & Storage**: Supabase PostgreSQL
- **Testing**: Pytest with automated domain routing and flow simulation suites

---

## Getting Started

### 1. Backend Setup

```bash
cd murf-livekit-starter/backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .
python src/agent.py dev
```

### 2. Run Tests

```bash
pytest tests/test_router.py tests/test_flow_simulation.py -v
```

### 3. Frontend Setup

```bash
npm install
npm run dev
```

---

## License

MIT License
