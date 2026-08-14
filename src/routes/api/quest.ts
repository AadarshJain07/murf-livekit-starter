import { createFileRoute } from "@tanstack/react-router";

const defaultQuestState = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, in_progress: 0, success_rate: 0 },
  mastery: [] as any[],
  weaknesses: [] as any[],
  next_quest: null as any,
};

function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  if (days.size === 0) return 0;

  const dayMs = 86_400_000;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - dayMs).toISOString().slice(0, 10);

  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0;

  let streak = 0;
  let t = new Date(`${cursor}T00:00:00.000Z`).getTime();
  while (days.has(new Date(t).toISOString().slice(0, 10))) {
    streak += 1;
    t -= dayMs;
  }
  return streak;
}

function masteryStatus(pct: number): string {
  if (pct >= 85) return "mastered";
  if (pct >= 60) return "strong";
  if (pct >= 35) return "learning";
  return "needs work";
}

export const Route = createFileRoute("/api/quest")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const [{ data: sessions }, { data: attempts }] = await Promise.all([
            supabaseAdmin
              .from("quest_sessions")
              .select("*")
              .order("started_at", { ascending: false }),
            supabaseAdmin
              .from("quest_attempts")
              .select("*")
              .order("created_at", { ascending: false }),
          ]);

          const sessionRows = sessions ?? [];
          const attemptRows = attempts ?? [];

          const total = sessionRows.length;
          const successful = sessionRows.filter((s: any) => s.outcome === "success").length;
          const failed = sessionRows.filter((s: any) => s.outcome === "failed").length;

          const sessionXp = sessionRows.reduce((acc: number, s: any) => acc + (s.xp_earned || 0), 0);
          const attemptXp = attemptRows.reduce((acc: number, a: any) => acc + (a.xp_earned || 0), 0);
          const xp = sessionXp || attemptXp;
          const level = Math.floor(xp / 250) + 1;

          // ---- Mastery per subject/topic (from attempts) ----
          const buckets = new Map<string, { subject: string; topic: string; correct: number; count: number }>();
          for (const a of attemptRows as any[]) {
            const subject = a.subject || "General";
            const topic = a.topic || a.concept || "Mixed";
            const key = `${subject}::${topic}`;
            const b = buckets.get(key) ?? { subject, topic, correct: 0, count: 0 };
            b.count += 1;
            if (a.correct) b.correct += 1;
            buckets.set(key, b);
          }
          const mastery = [...buckets.values()]
            .map((b) => {
              const pct = Math.round((b.correct / b.count) * 100);
              return { subject: b.subject, topic: b.topic, mastery: pct, attempts: b.count, status: masteryStatus(pct) };
            })
            .sort((a, b) => b.mastery - a.mastery);

          // ---- Weaknesses per concept ----
          const conceptBuckets = new Map<string, { concept: string; subject: string; correct: number; count: number }>();
          for (const a of attemptRows as any[]) {
            const concept = a.concept || a.topic;
            if (!concept) continue;
            const key = `${a.subject || "General"}::${concept}`;
            const b = conceptBuckets.get(key) ?? {
              concept,
              subject: a.subject || "General",
              correct: 0,
              count: 0,
            };
            b.count += 1;
            if (a.correct) b.correct += 1;
            conceptBuckets.set(key, b);
          }
          const weaknesses = [...conceptBuckets.values()]
            .filter((b) => b.count >= 2 && b.correct / b.count < 0.6)
            .map((b) => ({
              concept: b.concept,
              subject: b.subject,
              accuracy: Math.round((b.correct / b.count) * 100),
              attempts: b.count,
            }))
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 6);

          // ---- Next quest recommendation ----
          let next_quest: any = null;
          if (weaknesses.length > 0) {
            const w = weaknesses[0]!;
            next_quest = {
              type: "boss",
              subject: w.subject,
              topic: w.concept,
              title: `Boss Battle — ${w.concept}`,
              reason: `You're at ${w.accuracy}% accuracy on ${w.concept}. Beat this boss to lock it in.`,
            };
          } else if (mastery.length > 0) {
            const weakest = mastery[mastery.length - 1]!;
            next_quest = {
              type: "practice",
              subject: weakest.subject,
              topic: weakest.topic,
              title: `Level Up — ${weakest.topic}`,
              reason: `Push ${weakest.topic} from ${weakest.mastery}% to mastery with a fresh quest.`,
            };
          } else {
            next_quest = {
              type: "starter",
              subject: "Physics",
              topic: "Motion Basics",
              title: "First Quest — Motion Basics",
              reason: "Start your journey with a warm-up quest and earn your first XP.",
            };
          }

          return Response.json({
            level,
            xp,
            streak: computeStreak(sessionRows.map((s: any) => s.started_at).filter(Boolean)),
            sessions: {
              total,
              successful,
              failed,
              in_progress: Math.max(total - successful - failed, 0),
              success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
            },
            mastery,
            weaknesses,
            next_quest,
          });
        } catch (error) {
          console.warn("[/api/quest] Supabase query failed or not configured:", error);
        }

        return Response.json(defaultQuestState);
      },
    },
  },
});
