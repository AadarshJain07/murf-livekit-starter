import { createFileRoute } from "@tanstack/react-router";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8082";

// Default placeholder quest state when backend and JSON are unavailable.
const defaultQuestState = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [],
  weaknesses: [],
  next_quest: null,
};

async function readQuestStateFromFile() {
  if (typeof window !== "undefined") return defaultQuestState;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const candidatePaths = [
      path.resolve(process.cwd(), "murf-livekit-starter", "backend", "quest_state.json"),
      path.resolve(process.cwd(), "backend", "quest_state.json"),
    ];

    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, "utf-8");
          if (raw.trim()) {
            return JSON.parse(raw);
          }
        }
      } catch (error) {
        console.error(`[readQuestStateFromFile] Failed at ${filePath}:`, error);
      }
    }
  } catch (err) {
    console.error("[readQuestStateFromFile] Dynamic node import failed:", err);
  }

  return defaultQuestState;
}

export const Route = createFileRoute("/api/quest")({
  server: {
    handlers: {
      GET: async () => {
        // 1. Try live Python backend (reads directly from Revora.db)
        try {
          const res = await fetch(`${PYTHON_BACKEND_URL}/api/quest-state`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const liveState = await res.json();
            return Response.json(liveState);
          }
        } catch {
          // Python API server not running — fallback to disk JSON mirror
        }

        // 2. Fallback to murf-livekit-starter/backend/quest_state.json
        const state = await readQuestStateFromFile();
        return Response.json(state);
      },
    },
  },
} as any);

