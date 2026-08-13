import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

// Default placeholder quest state to use when no persisted state is found.
const defaultQuestState = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [],
  weaknesses: [],
  next_quest: null,
};

function readQuestState() {
  // Possible locations where the quest_state.json might reside.
  const candidatePaths = [
    path.resolve(process.cwd(), "murf-livekit-starter", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "routes", "backend", "quest_state.json"),
    // Fallback to the directory of this file.
    path.resolve(__dirname, "..", "..", "backend", "quest_state.json"),
  ];

  console.log("[readQuestState] process.cwd():", process.cwd());

  for (const filePath of candidatePaths) {
    console.log("[readQuestState] Checking path:", filePath);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (raw.trim()) {
          console.log("[readQuestState] Found at:", filePath);
          return JSON.parse(raw);
        }
      }
    } catch (error) {
      console.error(`[readQuestState] Failed to read quest state at ${filePath}:`, error);
    }
  }

  console.log("[readQuestState] No quest_state.json found – using default state");
  return defaultQuestState;
}

export const Route = createFileRoute("/api/quest")({
  server: {
    handlers: {
      GET: async () => {
        const state = readQuestState();
        return Response.json(state);
      },
    },
  },
} as any);
