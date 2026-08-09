import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  BrainCircuit,
  Languages,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  SendHorizontal,
  Sparkles,
  Video,
  VideoOff,
  Zap,
} from "lucide-react";

import { AnimatedBackground } from "@/components/preppilot/AnimatedBackground";
import { VideoTile } from "@/components/preppilot/VideoTile";
import { VoiceOrb, type VoicePhase } from "@/components/preppilot/VoiceOrb";
import { Waveform } from "@/components/preppilot/Waveform";
import { Button } from "@/components/ui/button";
import { useLiveKitSession } from "@/hooks/useLiveKitSession";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrepPilot AI — Voice-First AI Tutor for Indian Students" },
      {
        name: "description",
        content:
          "PrepPilot AI is a voice-first AI tutor that explains concepts, runs quizzes and revises lessons in English, Hindi and Hinglish.",
      },
      { property: "og:title", content: "PrepPilot AI — Voice-First AI Tutor for Indian Students" },
      {
        property: "og:description",
        content:
          "PrepPilot AI is a voice-first AI tutor that explains concepts, runs quizzes and revises lessons in English, Hindi and Hinglish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PROMPTS = [
  {
    icon: BrainCircuit,
    title: "Explain Photosynthesis",
    prompt: "Explain photosynthesis in simple words with an example.",
  },
  {
    icon: Sparkles,
    title: "Quiz me on Physics",
    prompt: "Quiz me with 5 questions on Physics — motion and force.",
  },
  {
    icon: BookOpenCheck,
    title: "Solve a Maths Doubt",
    prompt: "Help me solve a Maths doubt on quadratic equations, step by step.",
  },
  {
    icon: Languages,
    title: "Revise Chemistry",
    prompt: "Revise Chemistry: acids, bases and salts — Hinglish mein samjhao.",
  },
];

const LANGUAGES = ["English", "हिन्दी", "Hinglish"];

const PHASE_COPY: Record<VoicePhase, { label: string; title: string; hint: string }> = {
  idle: {
    label: "Ready",
    title: "Ready to Learn",
    hint: "Ask PrepPilot anything about your studies.",
  },
  connecting: {
    label: "Connecting",
    title: "Connecting...",
    hint: "Getting PrepPilot AI ready...",
  },
  listening: {
    label: "Listening",
    title: "Listening to you...",
    hint: "Speak now — English, Hindi or Hinglish.",
  },
  user: {
    label: "Listening",
    title: "Listening to you...",
    hint: "Keep going, PrepPilot is following along.",
  },
  speaking: {
    label: "Speaking",
    title: "PrepPilot is speaking...",
    hint: "Listen in — you can interrupt anytime.",
  },
  ended: {
    label: "Ended",
    title: "Session Ended",
    hint: "Ready for another learning session?",
  },
};

function Index() {
  const {
    level,
    active,
    status,
    error,
    ended,
    micDenied,
    toggle,
    connect,
    sendText,
    turns,
    agentSpeaking,
    agentOnline,
    agentMissing,

    micEnabled,
    toggleMic,
    cameraEnabled,
    toggleCamera,
    screenShareEnabled,
    toggleScreenShare,
    localVideo,
    screenVideo,
  } = useLiveKitSession();
  const [showTranscript, setShowTranscript] = useState(true);
  const [draft, setDraft] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [memoryConsent, setMemoryConsent] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const phase: VoicePhase = useMemo(() => {
    if (status === "connecting") return "connecting";
    if (!active) return ended ? "ended" : "idle";
    if (agentSpeaking) return "speaking";
    return level > 0.06 ? "user" : "listening";
  }, [status, active, agentSpeaking, level, ended]);

  const lastTurn = turns[turns.length - 1];
  const replying = agentSpeaking || awaitingReply;

  // Clear the "replying" state once the agent actually answers.
  useEffect(() => {
    if (lastTurn?.role === "agent") setAwaitingReply(false);
  }, [lastTurn?.id, lastTurn?.role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, showTranscript, replying]);

  const askTopic = async (prompt: string) => {
    setAwaitingReply(true);
    const sent = await sendText(prompt);
    if (!sent) {
      await connect();
      await sendText(prompt);
    }
  };

  const submitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await askTopic(text);
  };

  const copy = PHASE_COPY[phase];
  const hasTurns = turns.length > 0;


  return (
    <>
      <AnimatedBackground />

      <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
        <header className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5">
          <a href="/" className="group flex min-w-0 items-center gap-3">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-brand shadow-[var(--glow-brand)] transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="relative z-10 h-5 w-5 text-primary-foreground" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/40 to-transparent opacity-60" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold tracking-tight">
                PrepPilot AI
              </span>
              <span className="hidden text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:block">
                Your Voice Learning Companion
              </span>
            </span>
          </a>

          <span className="glass inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide">
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`absolute inset-0 rounded-full ${
                  phase === "idle" || phase === "ended"
                    ? "bg-muted-foreground"
                    : phase === "speaking"
                      ? "bg-brand-purple"
                      : "bg-brand-cyan"
                }`}
              />
              {phase !== "idle" && phase !== "ended" && (
                <span
                  className={`absolute inset-0 animate-ping rounded-full ${
                    phase === "speaking" ? "bg-brand-purple" : "bg-brand-cyan"
                  }`}
                />
              )}
            </span>
            {copy.label}
          </span>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 pt-1 pb-40 sm:pb-44">
          {/* Hero */}
          {!hasTurns && (
            <section className="animate-rise flex w-full flex-col items-center text-center">
              <span className="glass-strong inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
                Murf · LiveKit · Gemini
              </span>
              <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold text-balance sm:text-5xl">
                PrepPilot <span className="text-gradient">AI</span>
              </h1>
              <p className="mt-3 font-display text-lg font-semibold sm:text-xl">
                Your Voice Learning Companion
              </p>
              <p className="mt-3 max-w-lg text-base text-pretty text-muted-foreground sm:text-lg">
                Talk to PrepPilot, ask a study question, and learn through voice.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {LANGUAGES.map((l) => (
                  <span
                    key={l}
                    className="glass rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Conversation stage */}
          <section className="flex w-full flex-col items-center py-4 sm:py-6">
            <VoiceOrb level={level} phase={phase} onClick={toggle} />

            {/* Big, unmistakable state banner */}
            <div className="mt-6 flex flex-col items-center text-center">
              <span
                className={`glass-strong inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold ${
                  phase === "speaking"
                    ? "text-brand-purple shadow-[var(--glow-brand)]"
                    : phase === "listening" || phase === "user"
                      ? "text-brand-cyan shadow-[var(--glow-cyan)]"
                      : "text-foreground"
                }`}
              >
                {phase === "listening" || phase === "user" ? (
                  <Mic className="h-4 w-4 animate-pulse" />
                ) : phase === "speaking" ? (
                  <span className="flex items-end gap-[3px]">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-brand-purple"
                        style={{
                          height: `${8 + (i % 2) * 6}px`,
                          animation: `wave-bar ${0.6 + i * 0.1}s ease-in-out ${i * 0.08}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                ) : phase === "connecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {copy.title}
              </span>
            </div>

            <Waveform
              level={level}
              speaking={replying}
              active={active}
              className="mt-5 w-full max-w-md"
            />

            {replying ? (
              <span className="glass-strong animate-rise mt-4 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--glow-brand)]">
                <span className="flex items-end gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="animate-think-dot h-1.5 w-1.5 rounded-full bg-gradient-brand"
                      style={{ animationDelay: `${i * 0.16}s` }}
                    />
                  ))}
                </span>
                <span className="text-gradient">PrepPilot is replying…</span>
              </span>
            ) : (
              <p className="mt-4 min-h-6 text-sm text-muted-foreground">
                {micDenied ? null : error ? (
                  <span className="text-destructive">{error}</span>
                ) : (
                  copy.hint
                )}
              </p>
            )}

            {/* Memory consent + Start conversation */}
{!active && status !== "connecting" && (
  <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3">
    {!memoryConsent && !ended && (
      <div className="glass-strong animate-rise w-full rounded-3xl p-5 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand shadow-[var(--glow-brand)]">
          <BrainCircuit className="h-5 w-5 text-primary-foreground" />
        </div>

        <p className="mt-3 font-display text-base font-bold">
          Let PrepPilot Remember You?
        </p>

        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          PrepPilot can remember useful learning details like your name,
          class level, topics covered, and common mistakes to personalize
          future conversations.
        </p>

        <p className="mt-2 text-[11px] text-muted-foreground/80">
          You can choose not to save your information.
        </p>

        <Button
          type="button"
          onClick={() => setMemoryConsent(true)}
          className="mt-4 h-11 w-full rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground shadow-[var(--glow-brand)]"
        >
          <BrainCircuit className="mr-2 h-4 w-4" />
          Yes, Remember Me
        </Button>
      </div>
    )}

    {(memoryConsent || ended) && (
      <Button
        type="button"
        onClick={() => void connect()}
        className="animate-rise h-12 rounded-full bg-gradient-brand px-7 text-sm font-semibold text-primary-foreground shadow-[var(--glow-brand)] transition-transform hover:scale-[1.03]"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {ended ? "Start Again" : "Start Conversation"}
      </Button>
    )}
  </div>
)}

            {/* Microphone permission error */}
            {micDenied && (
              <div className="glass-strong animate-rise mt-5 max-w-md rounded-3xl border border-destructive/30 p-5 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-destructive/15">
                  <MicOff className="h-5 w-5 text-destructive" />
                </span>
                <p className="mt-3 font-display text-base font-bold">Microphone Access Needed</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  PrepPilot needs microphone access to hear you. Please allow microphone access in
                  your browser settings and try again.
                </p>
                <Button
                  type="button"
                  onClick={() => void connect()}
                  className="mt-4 h-10 rounded-full bg-gradient-brand px-5 text-xs font-semibold text-primary-foreground"
                >
                  Try Again
                </Button>
              </div>
            )}

            {agentMissing && !agentOnline && (
              <div className="glass-strong animate-rise mt-4 max-w-md rounded-2xl px-4 py-3 text-left text-xs leading-relaxed">
                <p className="font-semibold text-brand-cyan">Tutor isn&apos;t online yet</p>
                <p className="mt-1 text-muted-foreground">
                  You&apos;re connected to the room, but the PrepPilot agent isn&apos;t running.
                  Start it on your machine with{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5">
                    uv run python src/agent.py dev
                  </code>{" "}
                  inside <span className="font-medium">murf-livekit-starter/backend</span>, then
                  reconnect.
                </p>
              </div>
            )}
          </section>



          {/* Optional camera / screen share previews */}
          {(localVideo || screenVideo) && (
            <section className="grid w-full gap-3 sm:grid-cols-2">
              {screenVideo && (
                <VideoTile
                  track={screenVideo}
                  label="Your screen"
                  className="aspect-video sm:col-span-2"
                />
              )}
              {localVideo && (
                <VideoTile track={localVideo} label="You" className="mx-auto aspect-video w-56" />
              )}
            </section>
          )}




          {/* Suggested prompts */}
          {!hasTurns && (
            <section className="animate-rise w-full">
              <p className="mb-3 text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Try saying
              </p>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {PROMPTS.map(({ icon: Icon, title, prompt }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => void askTopic(prompt)}
                    className="group glass relative flex items-start gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[var(--glow-brand)]"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-gradient-brand opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]" />
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-[var(--glow-brand)]">
                      <Icon className="h-4.5 w-4.5 text-primary-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {prompt}
                      </span>
                    </span>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Live transcript */}
          {hasTurns && showTranscript && (
            <section className="animate-rise glass-strong mt-6 w-full rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Live transcript
                </h2>
                <span className="text-[11px] text-muted-foreground">{turns.length} turns</span>
              </div>
              <div
                ref={scrollRef}
                className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
              >
                {turns.map((t) => (
                  <div
                    key={t.id}
                    className={`flex ${t.role === "agent" ? "justify-start" : "justify-end"}`}
                  >
                    <p
                      className={`animate-rise max-w-[88%] px-4 py-2.5 text-sm leading-relaxed ${
                        t.role === "agent"
                          ? "glass rounded-2xl rounded-bl-md text-foreground"
                          : "rounded-2xl rounded-br-md bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]"
                      }`}
                    >
                      {t.text}
                    </p>
                  </div>
                ))}
                {replying && (
                  <div className="flex justify-start">
                    <span className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="animate-think-dot h-1.5 w-1.5 rounded-full bg-foreground/70"
                          style={{ animationDelay: `${i * 0.16}s` }}
                        />
                      ))}
                    </span>
                  </div>
                )}

              </div>
            </section>
          )}

          {/* Feature badges */}
          {!hasTurns && (
            <section className="animate-rise mt-10 grid w-full grid-cols-3 gap-3 text-center">
              {[
                { icon: Zap, label: "Instant", desc: "Voice replies" },
                { icon: Languages, label: "3 Languages", desc: "English / Hindi / Hinglish" },
                { icon: BookOpenCheck, label: "Adaptive", desc: "Quizzes & revision" },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="glass flex flex-col items-center gap-2 rounded-2xl px-3 py-4"
                >
                  <Icon className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>

        {/* Footer */}
        {!hasTurns && (
          <footer className="mx-auto w-full max-w-6xl px-5 py-6 pb-24 text-center text-xs text-muted-foreground sm:pb-28">
            Built for Indian students · Murf Falcon · Gemini · LiveKit · Deepgram
          </footer>
        )}

        {/* Composer + floating controls */}
        <div className="fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-3 px-4 sm:bottom-6">
          <form
            onSubmit={submitDraft}
            className="glass-strong flex w-full max-w-xl items-center gap-2 rounded-full p-1.5 pl-4 shadow-[var(--glow-cyan)]"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type instead of talking — English, Hindi or Hinglish…"
              aria-label="Message PrepPilot AI"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!draft.trim()}
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-brand text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </form>

          <div className="glass-strong flex items-center gap-2 rounded-full p-2">

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
              disabled={!active}
              onClick={() => void toggleMic()}
              className="h-12 w-12 rounded-full transition-transform hover:scale-105 hover:bg-foreground/10 disabled:opacity-40"
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              disabled={!active}
              onClick={() => void toggleCamera()}
              className={`h-12 w-12 rounded-full transition-transform hover:scale-105 hover:bg-foreground/10 disabled:opacity-40 ${
                cameraEnabled ? "text-brand-cyan" : "text-muted-foreground"
              }`}
            >
              {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={screenShareEnabled ? "Stop sharing screen" : "Share your screen"}
              disabled={!active}
              onClick={() => void toggleScreenShare()}
              className={`h-12 w-12 rounded-full transition-transform hover:scale-105 hover:bg-foreground/10 disabled:opacity-40 ${
                screenShareEnabled ? "text-brand-cyan" : "text-muted-foreground"
              }`}
            >
              {screenShareEnabled ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <MonitorUp className="h-5 w-5" />
              )}
            </Button>



            {active ? (
              <Button
                type="button"
                onClick={toggle}
                aria-label="End conversation"
                className="h-12 rounded-full bg-destructive px-6 text-sm font-semibold text-destructive-foreground transition-transform hover:scale-[1.03] hover:bg-destructive/90"
              >
                <PhoneOff className="mr-2 h-4 w-4" /> End
              </Button>
            ) : (
              <Button
                type="button"
                onClick={toggle}
                disabled={status === "connecting"}
                className="h-12 rounded-full bg-gradient-brand px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-60"
              >
                {status === "connecting" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {status === "connecting"
                  ? "Connecting…"
                  : ended
                    ? "Start Again"
                    : "Start Conversation"}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
              onClick={() => setShowTranscript((v) => !v)}
              className={`h-12 w-12 rounded-full transition-transform hover:scale-105 hover:bg-foreground/10 ${
                showTranscript ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <MessageSquareText className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
