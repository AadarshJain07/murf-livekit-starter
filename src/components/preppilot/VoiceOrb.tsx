export type VoicePhase = "idle" | "connecting" | "listening" | "user" | "speaking";

type Props = {
  level: number;
  phase: VoicePhase;
  onClick: () => void;
};

/** Premium glass voice orb with distinct idle / listening / thinking / speaking states. */
export function VoiceOrb({ level, phase, onClick }: Props) {
  const idle = phase === "idle";
  const active = !idle && phase !== "connecting";
  const speaking = phase === "speaking";
  const thinking = phase === "connecting";
  const listening = phase === "listening" || phase === "user";
  const scale = 1 + (speaking ? 0.18 : level * 0.35);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "End conversation" : "Start conversation"}
      className="group relative grid h-56 w-56 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/60 sm:h-72 sm:w-72"
    >
      {/* outer ambient glow */}
      <span
        className={`absolute inset-0 rounded-full bg-gradient-brand blur-3xl transition-all duration-700 ${
          active ? "opacity-70" : "opacity-25 group-hover:opacity-45"
        }`}
        style={{ transform: `scale(${scale * 1.15})` }}
      />

      {/* inner soft glow */}
      <span
        className={`absolute inset-4 rounded-full bg-gradient-brand blur-2xl transition-opacity duration-500 ${
          active ? "opacity-50" : "opacity-20"
        }`}
        style={{ transform: `scale(${scale})` }}
      />

      {/* listening ripples */}
      {listening && (
        <>
          <span className="absolute inset-2 rounded-full border border-white/30 animate-ripple" />
          <span
            className="absolute inset-2 rounded-full border border-white/20 animate-ripple"
            style={{ animationDelay: "1s" }}
          />
          <span
            className="absolute inset-2 rounded-full border border-white/10 animate-ripple"
            style={{ animationDelay: "2s" }}
          />
        </>
      )}

      {/* rotating rings */}
      <span
        className={`absolute inset-6 rounded-full border border-dashed border-white/20 ${
          thinking ? "animate-spin-fast" : "animate-spin-slow"
        }`}
      />
      <span
        className={`absolute inset-10 rounded-full border border-white/10 transition-all duration-500 ${
          thinking ? "animate-spin-fast [animation-direction:reverse]" : "opacity-0"
        }`}
      />

      {/* core orb */}
      <span
        className="absolute inset-8 rounded-full bg-gradient-brand animate-orb-pulse transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      />
      <span
        className={`absolute inset-8 rounded-full glass transition-opacity duration-500 ${
          active ? "opacity-90" : "opacity-100"
        }`}
      />
      <span
        className="absolute inset-14 rounded-full bg-gradient-brand opacity-70 blur-md transition-transform duration-200"
        style={{ transform: `scale(${speaking ? 1.12 : 1 + level * 0.25})` }}
      />

      {/* specular highlight + rim depth */}
      <span className="pointer-events-none absolute inset-8 rounded-full bg-linear-to-b from-white/50 via-white/8 to-transparent opacity-80" />
      <span className="pointer-events-none absolute inset-8 rounded-full shadow-[inset_0_-28px_60px_-28px_rgba(0,0,0,0.75),inset_0_2px_1px_rgba(255,255,255,0.4)]" />

      {/* level ring */}
      <svg
        className="absolute inset-0 h-full w-full -rotate-90 opacity-60"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-white/10"
        />
        {active && level > 0.02 && (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="url(#orbGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${level * 289} 289`}
            className="transition-all duration-150"
          />
        )}
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-blue)" />
            <stop offset="55%" stopColor="var(--brand-purple)" />
            <stop offset="100%" stopColor="var(--brand-cyan)" />
          </linearGradient>
        </defs>
      </svg>

      {/* thinking dots */}
      {thinking && (
        <span className="relative z-10 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-foreground/90 animate-think-dot"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      )}

      {/* hover lift ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full border border-white/5 opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
    </button>
  );
}
