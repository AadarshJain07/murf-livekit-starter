import { createFileRoute } from "@tanstack/react-router";

// Default placeholder quest state to use when no persisted state is found.
const defaultQuestState = {
  level: 1,
  xp: 0,
  streak: 0,
  sessions: { total: 0, successful: 0, failed: 0, success_rate: 0 },
  mastery: [] as any[],
  weaknesses: [] as any[],
  next_quest: null,
};

export const Route = createFileRoute("/api/quest")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: sessions } = await supabaseAdmin
            .from("quest_sessions")
            .select("*")
            .order("started_at", { ascending: false });

          if (sessions) {
            const total = sessions.length;
            const successful = sessions.filter((s: any) => s.outcome === "success").length;
            const failed = sessions.filter((s: any) => s.outcome === "failed").length;
            const xp = sessions.reduce((acc: number, s: any) => acc + (s.xp_earned || 0), 0);
            const level = Math.floor(xp / 250) + 1;

            return Response.json({
              ...defaultQuestState,
              xp,
              level,
              sessions: {
                total,
                successful,
                failed,
                in_progress: total - successful - failed,
                success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
              },
            });
          }
        } catch (error) {
          console.warn("[/api/quest] Supabase query failed or not configured:", error);
        }

        return Response.json(defaultQuestState);
      },
    },
  },
} as any);
