import { createFileRoute } from "@tanstack/react-router";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8082";

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

async function readEscalationsFromFile(): Promise<Escalation[]> {
  if (typeof window !== "undefined") return [];
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const candidatePaths = [
      path.resolve(process.cwd(), "murf-livekit-starter", "backend", "escalations.json"),
      path.resolve(process.cwd(), "backend", "escalations.json"),
    ];

    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, "utf-8");
          if (raw.trim()) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.escalations)) {
              return data.escalations as Escalation[];
            }
          }
        }
      } catch (error) {
        console.error(`[readEscalationsFromFile] Failed at ${filePath}:`, error);
      }
    }
  } catch (err) {
    console.error("[readEscalationsFromFile] Dynamic node import failed:", err);
  }

  return [];
}

export const Route = createFileRoute("/api/escalations")({
  server: {
    handlers: {
      GET: async () => {
        // 1. Try live Python backend (reads directly from Revora.db)
        try {
          const res = await fetch(`${PYTHON_BACKEND_URL}/api/escalations`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const liveData = await res.json();
            return Response.json(liveData);
          }
        } catch {
          // Python API server not running — fallback to disk JSON mirror
        }

        // 2. Fallback to murf-livekit-starter/backend/escalations.json
        const escalations = await readEscalationsFromFile();
        return Response.json({ escalations });
      },
    },
  },
} as any);
