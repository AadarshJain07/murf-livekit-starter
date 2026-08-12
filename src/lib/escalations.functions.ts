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
  const filePath = path.resolve(
    process.cwd(),
    "backend",
    "escalations.json"
  );

  try {
    if (!fs.existsSync(filePath)) {
      console.error("Escalation file not found:", filePath);
      return [];
    }

    const raw = fs.readFileSync(filePath, "utf-8");

    if (!raw.trim()) {
      return [];
    }

    const data = JSON.parse(raw);

    if (Array.isArray(data.escalations)) {
      return data.escalations as Escalation[];
    }

    return [];
  } catch (error) {
    console.error("Failed to read escalation data:", error);
    return [];
  }
}