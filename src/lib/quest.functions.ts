import { getBackendUrl } from "./backend";

const DEFAULT_QUEST_STATE = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [] as any[],
  weaknesses: [] as any[],
  next_quest: null,
};

export async function getQuestState() {
  // 1. Try the Python backend API (live data from SQLite)
  const BACKEND_URL = getBackendUrl();
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/quest-state`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...DEFAULT_QUEST_STATE,
          ...data,
          sessions: { ...DEFAULT_QUEST_STATE.sessions, ...(data.sessions ?? {}) },
        };
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
    return {
      ...DEFAULT_QUEST_STATE,
      ...data,
      sessions: { ...DEFAULT_QUEST_STATE.sessions, ...(data.sessions ?? {}) },
    };
  } catch (err) {
    console.warn("[getQuestState] Fetch failed — using default state:", err);
    return DEFAULT_QUEST_STATE;
  }
}
