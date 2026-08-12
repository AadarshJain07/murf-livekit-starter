import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  LifeBuoy,
  RefreshCw,
  Clock3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { AnimatedBackground } from "@/components/Revora/AnimatedBackground";
import { Button } from "@/components/ui/button";
import {
  getEscalations,
  type Escalation,
} from "@/lib/escalations.functions";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "My Support Requests — Revora" },
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

function SupportDashboard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["escalations"],
    queryFn: () => getEscalations(),
    refetchInterval: 10000,
  });

  // getEscalations() returns Escalation[]
  const requests: Escalation[] = data ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Revora
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <LifeBuoy className="size-5 text-primary" />
              </span>
              My Support Requests
            </h1>

            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Track requests you've created with Revora and see their current
              status.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-xl">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <h2 className="font-medium">Need help from a teacher?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Revora will ask for your permission before sharing the minimum
                information needed to create a teacher-support request.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {requests.map((item) => (
            <div
              key={item.reference_id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:bg-white/[0.06]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-medium text-primary">
                      {item.reference_id}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-1 text-xs capitalize text-sky-200">
                      {item.status === "open" ? (
                        <Clock3 className="size-3" />
                      ) : (
                        <CheckCircle2 className="size-3" />
                      )}
                      {item.status}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${
                        URGENCY_STYLES[item.urgency] ??
                        URGENCY_STYLES["medium"]
                      }`}
                    >
                      {item.urgency} priority
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-medium">{item.reason}</h3>

                  {item.topic && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Topic: {item.topic}
                    </p>
                  )}
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  <p>Created</p>
                  <p className="mt-1">{formatDate(item.created_at)}</p>
                </div>
              </div>

              {item.tried && (
                <div className="mt-5 rounded-2xl border border-white/5 bg-black/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    What Revora already tried
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.tried}
                  </p>
                </div>
              )}

              <div className="mt-5 flex items-start gap-3 border-t border-white/5 pt-4">
                {item.status === "open" ? (
                  <>
                    <Clock3 className="mt-0.5 size-4 text-amber-300" />
                    <p className="text-sm text-muted-foreground">
                      Your request is open. A teacher can review it and follow
                      up through the available support channel.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />
                    <p className="text-sm text-muted-foreground">
                      This support request has been completed.
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

          {!isLoading && requests.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center backdrop-blur-xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <LifeBuoy className="size-6 text-muted-foreground" />
              </div>

              <h2 className="mt-5 text-lg font-medium">
                No support requests yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                If you need help from a teacher, tell Revora. If human support
                is needed, Revora will ask for your permission before creating
                a request.
              </p>

              <Link to="/" className="mt-6 inline-block">
                <Button className="rounded-2xl">Continue Learning</Button>
              </Link>
            </div>
          )}

          {isLoading && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center backdrop-blur-xl">
              <RefreshCw className="mx-auto size-6 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Loading your support requests...
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Only the learning information needed for support is stored. Sensitive
          information such as passwords, OTPs and PINs is not stored.
        </p>
      </main>
    </div>
  );
}