const DEFAULT_QUEST_STATE = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [] as any[],
  weaknesses: [] as string[],
  next_quest: null,
};

export async function getQuestState() {
  try {
    const res = await fetch("/api/quest");
    if (!res.ok) {
      console.warn(`[getQuestState] /api/quest returned ${res.status} — using default state`);
      return DEFAULT_QUEST_STATE;
    }
    const data = await res.json();
    // Ensure required fields always exist
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
