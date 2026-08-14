# Revora AI — Development Guide

Revora is an autonomous voice learning assistant and multi-specialist tutor system for Class 11 students.

## Architecture

- **Backend**: Python LiveKit Agent, Murf Falcon TTS, Deepgram STT, Google Gemini LLM, Supabase DB.
- **Frontend**: TanStack Start / React, Tailwind CSS, LiveKit Web SDK.

## Key Guidelines

- Keep the multi-specialist learning router operational across Maths, Physics, Chemistry, and General subjects.
- Ensure state persistence (quests, mastery, memory, escalations) remains connected to Supabase PostgreSQL.
- Maintain test coverage across router and voice combat logic.
