import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  BrainCircuit,
  Compass,
  CheckCircle2,
  Flame,
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
  Swords,
  Video,
  VideoOff,
  Zap,
  Atom,
  Calculator,
  FlaskConical,
  Globe2,
  BookmarkPlus,
  Volume2,
  PhoneCall,
  BarChart3,
} from "lucide-react";

import { AnimatedBackground } from "@/components/Revora/AnimatedBackground";
import { RequestCallModal } from "@/components/Revora/RequestCallModal";
import { VideoTile } from "@/components/Revora/VideoTile";
import { VoiceOrb, type VoicePhase } from "@/components/Revora/VoiceOrb";
import { Waveform } from "@/components/Revora/Waveform";
import { QuestHUD } from "@/components/Revora/QuestHUD";
import { Button } from "@/components/ui/button";
import { useLiveKitSession } from "@/hooks/useLiveKitSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Revora AI — Voice-First AI Tutor for Indian Students" },
      {
        name: "description",
        content:
          "Revora AI is a voice-first AI tutor that explains concepts, runs quizzes and revises lessons in English, Hindi and Hinglish.",
      },
      { property: "og:title", content: "Revora AI — Voice-First AI Tutor for Indian Students" },
      {
        property: "og:description",
        content:
          "Revora AI is a voice-first AI tutor that explains concepts, runs quizzes and revises lessons in English, Hindi and Hinglish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type SubjectCategory = "All" | "Physics" | "Maths" | "Chemistry" | "Hinglish";

const PROMPTS = [
  {
    icon: Atom,
    category: "Physics",
    tag: "Concept Explainer",
    title: "Explain Photosynthesis & Light Reactions",
    prompt: "Explain photosynthesis in simple terms with a real-life example.",
  },
  {
    icon: Calculator,
    category: "Maths",
    tag: "Doubt Solver",
    title: "Solve Quadratic Equation Doubts",
    prompt: "Help me solve quadratic equations step by step using the quadratic formula.",
  },
  {
    icon: FlaskConical,
    category: "Chemistry",
    tag: "Revision & Quiz",
    title: "Acids, Bases & Salts Revision",
    prompt: "Revise Chemistry: acids, bases and salts — Hinglish mein simple tarike se samjhao.",
  },
  {
    icon: Globe2,
    category: "Hinglish",
    tag: "Interactive Quiz",
    title: "5-Question Physics Motion Quiz",
    prompt: "Quiz me with 5 quick conceptual questions on Motion and Force in Hinglish.",
  },
];

const LANGUAGES = [
  { label: "English", code: "EN" },
  { label: "हिन्दी", code: "HI" },
  { label: "Hinglish", code: "MIX" },
];

const PHASE_COPY: Record<VoicePhase, { label: string; title: string; hint: string }> = {
  idle: {
    label: "Ready to Speak",
    title: "Tap to Start Voice Lesson",
    hint: "Ask Revora any doubt about your studies or tap a topic below.",
  },
  connecting: {
    label: "Connecting",
    title: "Connecting to Revora AI…",
    hint: "Preparing your voice session with Murf Falcon & LiveKit…",
  },
  listening: {
    label: "Listening",
    title: "Listening to your voice…",
    hint: "Speak naturally in English, Hindi, or Hinglish.",
  },
  user: {
    label: "Listening",
    title: "Listening to you…",
    hint: "Revora is hearing your doubt.",
  },
  speaking: {
    label: "Revora Speaking",
    title: "Revora is explaining…",
    hint: "Listen in — feel free to interrupt or ask follow-up questions anytime.",
  },
  ended: {
    label: "Session Ended",
    title: "Voice Session Complete",
    hint: "Tap below to start another quick learning session.",
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
  const [activeCategory, setActiveCategory] = useState<SubjectCategory>("All");
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  
  // Auto-detect Quest Mode from transcript
  const [isQuestMode, setIsQuestMode] = useState(false);

  useEffect(() => {
    // Determine if we're in quest mode by looking for recent commands
    // Simple heuristic: if the user says "start a quest" or variations like "start a phy quest" or "start a physics quest" recently, we're in quest mode.
    // We exit quest mode if they say "end the quest" or if the session ends.
    if (ended) {
      setIsQuestMode(false);
      return;
    }

    // Check the last 10 messages for a quest trigger
    const recentTurns = turns.slice(-10);
    let questTriggered = false;
    let questEnded = false;

    for (const t of recentTurns) {
      const text = t.text.toLowerCase();
      if (t.role === "user" && (text.includes("start a quest") || text.includes("start a phy quest") || text.includes("start a physics quest"))) {
        questTriggered = true;
        questEnded = false; // Reset if they start another one
      }
      if (t.role === "user" && (text.includes("end the quest") || text.includes("stop the quest"))) {
        questEnded = true;
        questTriggered = false;
      }
    }

    if (questTriggered && !questEnded) {
      setIsQuestMode(true);
    } else if (questEnded) {
      setIsQuestMode(false);
    }
  }, [turns, ended]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const phase: VoicePhase = useMemo(() => {
    if (status === "connecting") return "connecting";
    if (!active) return ended ? "ended" : "idle";
    if (agentSpeaking) return "speaking";
    return level > 0.06 ? "user" : "listening";
  }, [status, active, agentSpeaking, level, ended]);

  const lastTurn = turns[turns.length - 1];
  const replying = agentSpeaking || awaitingReply;

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

  const filteredPrompts = useMemo(() => {
    if (activeCategory === "All") return PROMPTS;
    return PROMPTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <>
      <AnimatedBackground />

      <div className={`relative flex min-h-dvh flex-col overflow-x-hidden transition-colors duration-1000 ${isQuestMode ? 'bg-black/90 quest-mode-active' : ''}`}>
        {/* Navigation Header */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="group flex items-center gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-brand shadow-[var(--glow-brand)] transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="relative z-10 h-5 w-5 text-primary-foreground" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/30 to-transparent opacity-60" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Revora <span className="text-gradient">AI</span>
              </span>
              <span className="hidden text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase sm:block">
                Voice Tutor for India
              </span>
            </div>
          </a>

          {/* Status Badge & Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/quest"
              className="inline-flex items-center justify-center rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 px-3.5 py-1.5 text-xs font-bold hover:bg-orange-500/25 transition shadow-sm"
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Analytics
            </Link>
            <Button
              type="button"
              onClick={() => setIsCallModalOpen(true)}
              className="rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3.5 py-1.5 text-xs font-bold hover:bg-rose-500/25 transition shadow-sm"
            >
              <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
              Request Call
            </Button>

            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-foreground">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`absolute inset-0 rounded-full ${
                    phase === "idle" || phase === "ended"
                      ? "bg-muted-foreground/60"
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
              <span>{copy.label}</span>
            </span>

            <Link
              to="/support"
              className="glass hidden rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:border-white/20 sm:inline-flex"
            >
              Teacher Support
            </Link>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pt-2 pb-44 sm:pb-48">
          {/* Quest HUD */}
          <QuestHUD active={isQuestMode} />

          {/* Hero Banner (Shown when conversation is idle) */}
          {!hasTurns && !isQuestMode && (
            <section className="animate-rise flex w-full flex-col items-center text-center">
              <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-brand-purple animate-pulse" />
                Multilingual Voice Learning Companion
              </div>

              <h1 className="mt-4 font-display text-3xl leading-snug font-extrabold text-foreground sm:text-5xl">
                Master Any Subject with <span className="text-gradient">Natural Voice</span>
              </h1>

              <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
                Ask doubts, practice concepts, and run interactive revision quizzes naturally in English, Hindi & Hinglish.
              </p>

              {/* Language Tags */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {LANGUAGES.map((l) => (
                  <span
                    key={l.code}
                    className="glass rounded-full px-3.5 py-1 text-xs font-semibold text-muted-foreground/90 transition hover:text-foreground"
                  >
                    <span className="mr-1.5 text-[10px] text-brand-cyan font-bold">{l.code}</span>
                    {l.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Central Voice Stage */}
          <section className={`flex w-full flex-col items-center py-6 transition-all duration-700 ${isQuestMode ? 'scale-110 quest-orb-container' : ''}`}>
            <VoiceOrb level={level} phase={phase} onClick={toggle} />

            {/* Dynamic Status Title */}
            <div className="mt-6 flex flex-col items-center text-center">
              <span
                className={`glass-card inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  isQuestMode ? "text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]" :
                  phase === "speaking"
                    ? "text-brand-purple shadow-[var(--glow-brand)] border-brand-purple/30"
                    : phase === "listening" || phase === "user"
                      ? "text-brand-cyan shadow-[var(--glow-cyan)] border-brand-cyan/30"
                      : "text-foreground"
                }`}
              >
                {isQuestMode ? (
                   <Flame className="h-4 w-4 animate-pulse text-orange-500" />
                ) : phase === "listening" || phase === "user" ? (
                  <Mic className="h-4 w-4 animate-pulse text-brand-cyan" />
                ) : phase === "speaking" ? (
                  <Volume2 className="h-4 w-4 animate-bounce text-brand-purple" />
                ) : phase === "connecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                ) : (
                  <Sparkles className="h-4 w-4 text-brand-cyan" />
                )}
                {isQuestMode ? "Boss Battle Engaged" : copy.title}
              </span>
            </div>

            {/* Live Audio Waveform Visualizer */}
            <Waveform
              level={level}
              speaking={replying}
              active={active}
              className="mt-5 w-full max-w-md"
            />

            {/* Status Hint / Replying Indicator */}
            {replying ? (
              <span className="glass-card animate-rise mt-4 inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-xs font-semibold text-foreground shadow-[var(--glow-brand)]">
                <span className="flex items-end gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="animate-think-dot h-1.5 w-1.5 rounded-full bg-brand-cyan"
                      style={{ animationDelay: `${i * 0.16}s` }}
                    />
                  ))}
                </span>
                <span className="text-gradient">Revora is thinking & replying…</span>
              </span>
            ) : (
              <p className="mt-4 min-h-6 text-center text-sm font-medium text-muted-foreground">
                {micDenied ? null : error ? (
                  <span className="text-destructive font-semibold">{error}</span>
                ) : (
                  copy.hint
                )}
              </p>
            )}

            {/* Memory & Personalization Consent Banner */}
            {!active && status !== "connecting" && (
              <div className="mt-5 flex w-full max-w-md flex-col items-center gap-3">
                {!memoryConsent && !ended && (
                  <div className="glass-strong animate-rise w-full rounded-3xl p-6 text-center shadow-xl">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand shadow-[var(--glow-brand)]">
                      <BrainCircuit className="h-6 w-6 text-primary-foreground" />
                    </div>

                    <h3 className="mt-3 font-display text-base font-bold text-foreground">
                      Enable Personalized Learning Memory?
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Revora can remember your class grade, past topics covered, and tricky doubts to personalize future voice conversations for you.
                    </p>

                    <Button
                      type="button"
                      onClick={() => setMemoryConsent(true)}
                      className="mt-4 h-11 w-full rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground shadow-[var(--glow-brand)] transition-transform hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Yes, Remember My Progress
                    </Button>
                  </div>
                )}

                {(memoryConsent || ended) && (
                  <Button
                    type="button"
                    onClick={() => void connect()}
                    className="animate-rise h-12 rounded-full bg-gradient-brand px-8 text-sm font-semibold text-primary-foreground shadow-[var(--glow-brand)] transition-transform hover:scale-[1.03]"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {ended ? "Start New Session" : "Start Voice Lesson"}
                  </Button>
                )}
              </div>
            )}

            {/* Microphone Permission Warning */}
            {micDenied && (
              <div className="glass-strong animate-rise mt-5 max-w-md rounded-3xl border border-destructive/40 p-5 text-center shadow-xl">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-destructive/20 text-destructive">
                  <MicOff className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-base font-bold text-foreground">Microphone Access Blocked</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Revora requires microphone access to hear your doubts. Please grant mic permission in your browser URL bar.
                </p>
                <Button
                  type="button"
                  onClick={() => void connect()}
                  className="mt-4 h-10 rounded-full bg-gradient-brand px-6 text-xs font-semibold text-primary-foreground"
                >
                  Retry Microphone Connection
                </Button>
              </div>
            )}

            {/* Agent Offline Notice */}
            {agentMissing && !agentOnline && (
              <div className="glass-card animate-rise mt-4 max-w-md rounded-2xl p-4 text-left text-xs leading-relaxed border-brand-cyan/30">
                <p className="font-semibold text-brand-cyan flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Tutor Agent Offline
                </p>
                <p className="mt-1.5 text-muted-foreground">
                  You are connected to LiveKit room, but the backend python tutor process is not active. Start it with:
                </p>
                <code className="mt-2 block rounded-lg bg-black/40 p-2 font-mono text-[11px] text-foreground">
                  uv run python src/agent.py dev
                </code>
              </div>
            )}
          </section>

          {/* Local / Screen Video Tiles */}
          {(localVideo || screenVideo) && (
            <section className="mt-4 grid w-full gap-3 sm:grid-cols-2">
              {screenVideo && (
                <VideoTile
                  track={screenVideo}
                  label="Shared Screen"
                  className="aspect-video sm:col-span-2 rounded-2xl overflow-hidden glass-card"
                />
              )}
              {localVideo && (
                <VideoTile
                  track={localVideo}
                  label="You"
                  className="mx-auto aspect-video w-56 rounded-2xl overflow-hidden glass-card"
                />
              )}
            </section>
          )}

          {/* Interactive Subject Filters & Suggested Prompt Cards */}
          {!hasTurns && !isQuestMode && (
            <section className="animate-rise mt-6 w-full">
              {/* Category Filter Pills */}
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-brand-cyan" />
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Explore Doubt Topics
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["All", "Physics", "Maths", "Chemistry", "Hinglish"] as SubjectCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          activeCategory === cat
                            ? "bg-gradient-brand text-primary-foreground shadow-md"
                            : "glass text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Grid of Prompt Cards */}
              <div className="grid w-full gap-3.5 sm:grid-cols-2">
                {filteredPrompts.map(({ icon: Icon, category, tag, title, prompt }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => void askTopic(prompt)}
                    className="group glass-card relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/40 hover:shadow-[var(--glow-brand)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-sm">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-brand-cyan">
                          {tag}
                        </span>
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-foreground group-hover:text-brand-purple transition-colors">
                        {title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        &quot;{prompt}&quot;
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground border-t border-white/5 pt-2.5">
                      <span className="flex items-center gap-1 text-brand-purple">
                        <BookmarkPlus className="h-3.5 w-3.5" />
                        {category}
                      </span>
                      <span className="flex items-center gap-1 group-hover:text-foreground">
                        Tap to Ask <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Live Transcript Panel */}
          {hasTurns && showTranscript && (
            <section className={`animate-rise mt-6 w-full rounded-3xl p-5 shadow-2xl transition-all duration-500 ${isQuestMode ? 'bg-zinc-950/80 border-2 border-red-900/50 backdrop-blur-xl shadow-[0_0_30px_rgba(220,38,38,0.15)] quest-combat-log' : 'glass-strong'}`}>
              <div className={`flex items-center justify-between gap-3 border-b pb-3 ${isQuestMode ? 'border-red-900/50' : 'border-white/10'}`}>
                <div className="flex items-center gap-2">
                  {isQuestMode ? (
                     <Swords className="h-4 w-4 text-red-500" />
                  ) : (
                     <MessageSquareText className="h-4 w-4 text-brand-purple" />
                  )}
                  <h3 className={`text-xs font-bold tracking-wider uppercase ${isQuestMode ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {isQuestMode ? 'Combat Log' : 'Live Transcript'}
                  </h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-foreground ${isQuestMode ? 'bg-red-950/50 text-red-400 border border-red-500/20' : 'bg-white/10'}`}>
                  {turns.length} messages
                </span>
              </div>

              <div
                ref={scrollRef}
                className={`mt-4 max-h-[44vh] space-y-3.5 overflow-y-auto pr-1.5 [scrollbar-width:thin] ${isQuestMode ? 'font-mono' : ''}`}
              >
                {turns.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-start gap-2.5 ${t.role === "agent" ? "justify-start" : "justify-end"}`}
                  >
                    {t.role === "agent" && (
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-primary-foreground text-xs font-bold shadow-sm mt-0.5 ${isQuestMode ? 'bg-gradient-to-br from-red-600 to-orange-600 border border-red-400' : 'bg-gradient-brand'}`}>
                        R
                      </span>
                    )}

                    <div
                      className={`animate-rise max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        t.role === "agent"
                          ? (isQuestMode ? "bg-zinc-900 border border-red-900/50 text-red-50 rounded-tl-sm shadow-[0_0_10px_rgba(220,38,38,0.1)]" : "glass-card rounded-tl-sm text-foreground")
                          : (isQuestMode ? "rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-400/30" : "rounded-2xl rounded-tr-sm bg-gradient-brand text-primary-foreground shadow-[var(--glow-brand)]")
                      }`}
                    >
                      <p>{t.text}</p>
                    </div>
                  </div>
                ))}

                {replying && (
                  <div className="flex justify-start items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground text-xs font-bold shadow-sm">
                      R
                    </span>
                    <span className="glass-card flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="animate-think-dot h-2 w-2 rounded-full bg-brand-cyan"
                          style={{ animationDelay: `${i * 0.16}s` }}
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Feature Highlights Grid */}
          {!hasTurns && !isQuestMode && (
            <section className="animate-rise mt-10 grid w-full grid-cols-1 gap-3.5 sm:grid-cols-3">
              {[
                {
                  icon: Zap,
                  label: "Sub-Second Latency",
                  desc: "Powered by Murf Falcon & LiveKit real-time voice streaming.",
                },
                {
                  icon: Languages,
                  label: "3 Languages Supported",
                  desc: "Seamlessly switch between English, Hindi, and Hinglish.",
                },
                {
                  icon: BookOpenCheck,
                  label: "Adaptive Pedagogy",
                  desc: "Generates tailored step-by-step explanations and quizzes.",
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="glass-card flex flex-col items-start gap-2.5 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-brand-cyan border border-white/10">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{label}</h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>

        {/* Footer */}
        {!hasTurns && (
          <footer className="mx-auto w-full max-w-6xl px-5 py-6 pb-28 text-center text-xs text-muted-foreground sm:pb-32">
            Built for Indian students · Voice AI by Murf Falcon, Gemini, LiveKit & Deepgram
          </footer>
        )}

        {/* Floating Control Dock + Input Composer */}
        <div className="fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2.5 px-4 sm:bottom-6">
          {/* Input Bar */}
          <form
            onSubmit={submitDraft}
            className="glass-strong flex w-full max-w-lg items-center gap-2 rounded-full p-1.5 pl-4 shadow-2xl border-white/15"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your doubt — English, Hindi or Hinglish…"
              aria-label="Message Revora AI"
              className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!draft.trim()}
              className="h-9 w-9 shrink-0 rounded-full bg-gradient-brand text-primary-foreground transition-transform hover:scale-105 disabled:opacity-30"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </form>

          {/* Floating Control Buttons */}
          <div className="glass-strong flex items-center gap-2 rounded-full p-2 shadow-2xl border-white/15">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
              disabled={!active}
              onClick={() => void toggleMic()}
              className={`h-11 w-11 rounded-full transition-transform hover:scale-105 disabled:opacity-40 ${
                micEnabled ? "text-foreground hover:bg-white/10" : "bg-destructive/20 text-destructive"
              }`}
            >
              {micEnabled ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              disabled={!active}
              onClick={() => void toggleCamera()}
              className={`h-11 w-11 rounded-full transition-transform hover:scale-105 disabled:opacity-40 ${
                cameraEnabled ? "text-brand-cyan bg-brand-cyan/15" : "text-muted-foreground hover:bg-white/10"
              }`}
            >
              {cameraEnabled ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={screenShareEnabled ? "Stop sharing screen" : "Share your screen"}
              disabled={!active}
              onClick={() => void toggleScreenShare()}
              className={`h-11 w-11 rounded-full transition-transform hover:scale-105 disabled:opacity-40 ${
                screenShareEnabled ? "text-brand-cyan bg-brand-cyan/15" : "text-muted-foreground hover:bg-white/10"
              }`}
            >
              {screenShareEnabled ? (
                <MonitorOff className="h-4.5 w-4.5" />
              ) : (
                <MonitorUp className="h-4.5 w-4.5" />
              )}
            </Button>

            {/* Main Action Call Button */}
            {active ? (
              <Button
                type="button"
                onClick={toggle}
                aria-label="End conversation"
                className="h-11 rounded-full bg-destructive px-5 text-xs font-bold text-destructive-foreground transition-transform hover:scale-[1.03] hover:bg-destructive/90 shadow-md"
              >
                <PhoneOff className="mr-2 h-4 w-4" /> End Call
              </Button>
            ) : (
              <Button
                type="button"
                onClick={toggle}
                disabled={status === "connecting"}
                className="h-11 rounded-full bg-gradient-brand px-5 text-xs font-bold text-primary-foreground transition-transform hover:scale-[1.03] shadow-[var(--glow-brand)] disabled:opacity-60"
              >
                {status === "connecting" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {status === "connecting"
                  ? "Connecting…"
                  : ended
                    ? "Restart Lesson"
                    : "Start Voice Lesson"}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
              onClick={() => setShowTranscript((v) => !v)}
              className={`h-11 w-11 rounded-full transition-transform hover:scale-105 ${
                showTranscript ? "text-brand-cyan bg-white/10" : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              <MessageSquareText className="h-4.5 w-4.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Request teacher call"
              onClick={() => setIsCallModalOpen(true)}
              className="h-11 w-11 rounded-full text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 transition-transform hover:scale-105"
            >
              <PhoneCall className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Request Teacher Call Modal */}
      <RequestCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
      />
    </>
  );
}
