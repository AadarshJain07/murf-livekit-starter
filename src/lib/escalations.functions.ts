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

export async function getEscalations(): Promise<Escalation[]> {
  // If running in browser, fetch from API endpoint
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/escalations");
      if (!res.ok) {
        console.error("Escalations API returned non-OK status:", res.status);
        return [];
      }
      const data = await res.json();
      return data.escalations ?? [];
    } catch (error) {
      console.error("Failed to fetch escalations from API:", error);
      return [];
    }
  }

  // Server-side fallback reading candidate paths
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
      console.error(`Failed to read escalation data at ${filePath}:`, error);
    }
  }

  return [];
}