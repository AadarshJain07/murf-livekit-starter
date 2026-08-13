import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

function readQuestState() {
  const candidatePaths = [
    path.resolve(process.cwd(), "murf-livekit-starter", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "routes", "backend", "quest_state.json"),
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

  console.log("[readQuestState] File not found in any candidate paths");
  return null;
}

export const Route = createFileRoute("/api/quest")({
  server: {
    handlers: {
      GET: async () => {
        const state = readQuestState();
        return Response.json(state || { error: "Not found" });
      },
    },
  },
} as any);
