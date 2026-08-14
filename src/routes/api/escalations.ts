import { createFileRoute } from "@tanstack/react-router";

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
  phone_number?: string;
};

/**
 * API route to fetch teacher support escalations from Supabase.
 */
export const Route = createFileRoute("/api/escalations")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("escalations")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            return Response.json({ escalations: data as Escalation[] });
          }
        } catch (error) {
          console.warn("[/api/escalations] Supabase query failed or not configured:", error);
        }

        return Response.json({ escalations: [] });
      },
    },
  },
} as any);
