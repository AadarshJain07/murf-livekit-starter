import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  LifeBuoy,
  RefreshCw,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  PhoneCall,
  Radio,
} from "lucide-react";

import { AnimatedBackground } from "@/components/Revora/AnimatedBackground";
import { RequestCallModal } from "@/components/Revora/RequestCallModal";
import { Button } from "@/components/ui/button";
import {
  getEscalations,
  type Escalation,
} from "@/lib/escalations.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Teacher Support Requests — Revora AI" },
      {
        name: "description",
        content: "Track your teacher-help requests and their current status.",
      },
    ],
  }),
  component: SupportDashboard,
});

const URGENCY_STYLES: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  medium: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  low: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isLinphoneCall(item: Escalation): boolean {
  const method = (item.follow_up_method || "").toLowerCase();
  return method.includes("linphone") || method.includes("sip");
}

function SupportDashboard() {
  const [callModalOpen, setCallModalOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["escalations"],
    queryFn: () => getEscalations(),
    refetchInterval: 5000,
  });

  const requests: Escalation[] = data ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Revora Voice Tutor
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl font-display">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]">
                <LifeBuoy className="size-5" />
              </span>
              Teacher Support Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-xs sm:text-sm text-muted-foreground">
              Track your teacher escalation requests created by Revora AI and view follow-up status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setCallModalOpen(true)}
              className="rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-500/25 transition"
            >
              <PhoneCall className="mr-1.5 size-3.5" />
              Request Linphone Call
            </Button>

            <Button
              variant="secondary"
              onClick={() => void refetch()}
              className="glass gap-2 rounded-full border-white/15 px-4 text-xs font-semibold hover:border-white/30"
            >
              <RefreshCw
                className={`size-3.5 ${isFetching ? "animate-spin text-brand-cyan" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="mb-6 glass-card rounded-3xl p-5 shadow-xl border-brand-purple/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-brand-purple" />
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Human Teacher Support Dispatch
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                When you ask Revora for human teacher help, a ticket is logged below and automatically dispatched to our teacher support team via Discord.
              </p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.map((item) => (
            <div
              key={item.reference_id}
              className="glass-card rounded-3xl p-6 transition-all hover:border-brand-purple/40 hover:shadow-[var(--glow-brand)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold tracking-wider text-brand-purple bg-brand-purple/15 px-3 py-1 rounded-full border border-brand-purple/30">
                      {item.reference_id}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold capitalize text-sky-200">
                      {item.status === "open" ? (
                        <Clock3 className="size-3 text-sky-300" />
                      ) : (
                        <CheckCircle2 className="size-3 text-emerald-300" />
                      )}
                      {item.status}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                        URGENCY_STYLES[item.urgency] ??
                        URGENCY_STYLES["medium"]
                      }`}
                    >
                      {item.urgency} priority
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-foreground">{item.reason}</h3>

                  {item.topic && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Topic:</span> {item.topic}
                    </p>
                  )}

                  {/* Linphone SIP badge */}
                  {isLinphoneCall(item) && (item as any).phone_number && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1.5 text-[11px] font-mono font-semibold text-brand-cyan">
                      <Radio className="size-3" />
                      Linphone: {(item as any).phone_number}
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground/80">Created At</p>
                  <p className="mt-0.5 font-mono">{formatDate(item.created_at)}</p>
                </div>
              </div>

              {item.tried && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    What Revora Already Attempted
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {item.tried}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {item.status === "open" ? (
                    <>
                      <Clock3 className="size-4 text-amber-300" />
                      <span>Request is active. A human teacher will follow up shortly.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-300" />
                      <span>This request has been resolved by a teacher.</span>
                    </>
                  )}
                </div>

                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {isLinphoneCall(item) ? (
                    <Radio className="size-3 text-brand-cyan" />
                  ) : (
                    <MessageSquare className="size-3" />
                  )}
                  {isLinphoneCall(item) ? (
                    <span className="text-brand-cyan font-semibold">Linphone Call</span>
                  ) : (
                    item.follow_up_method
                  )}
                </span>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {!isLoading && requests.length === 0 && (
            <div className="glass-card rounded-3xl px-6 py-16 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]">
                <LifeBuoy className="size-6" />
              </div>

              <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                No Support Requests Found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                When you ask Revora AI to connect with a teacher during a voice conversation, your escalation request will automatically appear here.
              </p>

              <Link to="/" className="mt-6 inline-block">
                <Button className="rounded-full bg-gradient-brand px-6 text-xs font-semibold text-primary-foreground shadow-[var(--glow-brand)]">
                  Return to Voice Tutor
                </Button>
              </Link>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="glass-card rounded-3xl px-6 py-16 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-brand-cyan" />
              <p className="mt-4 text-xs font-semibold text-muted-foreground">
                Fetching support requests from server…
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Revora AI Teacher Support Store · Linphone SIP Callback Enabled · Privacy protected
        </p>
      </main>

      {/* Request Teacher Linphone Call Modal */}
      <RequestCallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}