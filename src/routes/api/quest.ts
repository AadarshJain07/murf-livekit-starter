import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

function readQuestState() {
  const candidatePaths = [
    path.resolve(process.cwd(), "murf-livekit-starter", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "backend", "quest_state.json"),
    path.resolve(process.cwd(), "src", "routes", "backend", "quest_state.json"),
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
      console.error(`Failed to read quest state at ${filePath}:`, error);
    }
  }

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
