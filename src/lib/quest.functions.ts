const BACKEND_URL =
  typeof window !== "undefined"
    ? (import.meta as any).env?.VITE_BACKEND_URL || ""
    : "";

export const DEFAULT_QUEST_STATE = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [] as any[],
  weaknesses: [] as string[],
  next_quest: null as any,
};

function normalizeQuestData(data: any) {
  if (!data || typeof data !== "object" || data.error) {
    return DEFAULT_QUEST_STATE;
  }
  return {
    ...DEFAULT_QUEST_STATE,
    ...data,
    level: typeof data.level === "number" ? data.level : DEFAULT_QUEST_STATE.level,
    xp: typeof data.xp === "number" ? data.xp : DEFAULT_QUEST_STATE.xp,
    streak: typeof data.streak === "number" ? data.streak : DEFAULT_QUEST_STATE.streak,
    sessions: {
      total: typeof data.sessions?.total === "number" ? data.sessions.total : 0,
      successful: typeof data.sessions?.successful === "number" ? data.sessions.successful : 0,
      failed: typeof data.sessions?.failed === "number" ? data.sessions.failed : 0,
      success_rate: typeof data.sessions?.success_rate === "number" ? data.sessions.success_rate : 0,
    },
    mastery: Array.isArray(data.mastery) ? data.mastery : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
    next_quest: data.next_quest ?? null,
  };
}

export async function getQuestState() {
  // 1. Try the Python backend API (live data from SQLite)
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/quest-state`);
      if (res.ok) {
        const data = await res.json();
        return normalizeQuestData(data);
      }
      console.warn(`[getQuestState] Backend returned ${res.status} — falling back`);
    } catch (err) {
      console.warn("[getQuestState] Backend unreachable — falling back:", err);
    }
  }

  // 2. Fallback: TanStack server-side API route (reads JSON file)
  try {
    const res = await fetch("/api/quest");
    if (!res.ok) {
      console.warn(`[getQuestState] /api/quest returned ${res.status} — using default state`);
      return DEFAULT_QUEST_STATE;
    }
    const data = await res.json();
    return normalizeQuestData(data);
  } catch (err) {
    console.warn("[getQuestState] Fetch failed — using default state:", err);
    return DEFAULT_QUEST_STATE;
  }
}

