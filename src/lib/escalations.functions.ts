import { getBackendUrl } from "./backend";

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
  // 1. Try the Python backend API (live data from SQLite)
  const BACKEND_URL = getBackendUrl();
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/escalations`);
      if (res.ok) {
        const data = await res.json();
        return data.escalations ?? [];
      }
      console.warn(`[getEscalations] Backend returned ${res.status} — falling back`);
    } catch (err) {
      console.warn("[getEscalations] Backend unreachable — falling back:", err);
    }
  }

  // 2. Fallback: TanStack server-side API route (reads JSON file)
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

  return [];
}