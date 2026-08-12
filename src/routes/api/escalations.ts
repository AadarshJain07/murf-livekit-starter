import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

export type Escalation = {
  reference_id: string;
  student: string;
  reason: string;
  topic: string;
  tried: string;
  urgency: "low" | "medium" | "high";
  language_preference: string;
  follow_up_method: string;
  status: string;
  created_at: string;
};

function readEscalationsFromFile(): Escalation[] {
  const candidatePaths = [
    path.resolve(process.cwd(), "murf-livekit-starter", "backend", "escalations.json"),
    path.resolve(process.cwd(), "backend", "escalations.json"),
    path.resolve(process.cwd(), "src", "backend", "escalations.json"),
    path.resolve(process.cwd(), "src", "routes", "backend", "escalations.json"),
  ];

  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (raw.trim()) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.escalations) && data.escalations.length > 0) {
            return data.escalations as Escalation[];
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read escalation file at ${filePath}:`, error);
    }
  }

  return [];
}

/**
  * API route to fetch teacher support escalations from the backend store.
  */
export const Route = createFileRoute("/api/escalations")({
  server: {
    handlers: {
      GET: async () => {
        const escalations = readEscalationsFromFile();
        return Response.json({ escalations });
      },
    },
  },
} as any);
