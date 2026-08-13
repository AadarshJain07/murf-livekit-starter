export type VoicePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "user"
  | "speaking"
  | "ended";

type Props = {
  level: number;
  phase: VoicePhase;
  onClick: () => void;
};

/** Tactile acoustic sound-sphere with organic glass depth & voice responsiveness. */
export function VoiceOrb({ level, phase, onClick }: Props) {
  const idle = phase === "idle" || phase === "ended";
  const active = !idle && phase !== "connecting";
  const speaking = phase === "speaking";
  const thinking = phase === "connecting";
  const listening = phase === "listening" || phase === "user";
  const scale = 1 + (speaking ? 0.16 : level * 0.32);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "End conversation" : "Start conversation"}
      className="group relative grid h-60 w-60 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/60 sm:h-72 sm:w-72 cursor-pointer transition-transform duration-300 active:scale-95"
    >
      {/* Outer ambient acoustic aura */}
      <span
        className={`absolute inset-0 rounded-full bg-gradient-brand blur-3xl transition-all duration-700 ${
          active ? "opacity-60" : "opacity-20 group-hover:opacity-40"
        }`}
        style={{ transform: `scale(${scale * 1.18})` }}
      />

      {/* Inner vibrant glow core */}
      <span
        className={`absolute inset-4 rounded-full bg-gradient-brand blur-2xl transition-opacity duration-500 ${
          active ? "opacity-50" : "opacity-15 group-hover:opacity-30"
        }`}
        style={{ transform: `scale(${scale})` }}
      />

      {/* Listening acoustic ripples */}
      {listening && (
        <>
          <span className="absolute inset-1 rounded-full border border-brand-cyan/40 animate-ripple" />
          <span
            className="absolute inset-1 rounded-full border border-brand-purple/30 animate-ripple"
            style={{ animationDelay: "0.9s" }}
          />
          <span
            className="absolute inset-1 rounded-full border border-white/20 animate-ripple"
            style={{ animationDelay: "1.8s" }}
          />
        </>
      )}

      {/* Rotating orbit ring */}
      <span
        className={`absolute inset-5 rounded-full border border-dashed border-white/20 transition-opacity duration-500 ${
          thinking ? "animate-spin-fast border-brand-cyan/60" : "animate-spin-slow opacity-40 group-hover:opacity-80"
        }`}
      />
      <span
        className={`absolute inset-9 rounded-full border border-white/10 transition-all duration-500 ${
          thinking ? "animate-spin-fast [animation-direction:reverse] border-brand-purple/50 opacity-100" : "opacity-0"
        }`}
      />

      {/* Core sound-sphere gradient */}
      <span
        className="absolute inset-8 rounded-full bg-gradient-brand transition-transform duration-200 shadow-2xl"
        style={{ transform: `scale(${scale})` }}
      />

      {/* Glass depth overlay */}
      <span
        className={`absolute inset-8 rounded-full glass transition-opacity duration-500 ${
          active ? "opacity-75" : "opacity-90 group-hover:opacity-80"
        }`}
      />

      {/* Acoustic wave pulse inside core */}
      <span
        className="absolute inset-12 rounded-full bg-gradient-brand opacity-60 blur-md transition-transform duration-200"
        style={{ transform: `scale(${speaking ? 1.15 : 1 + level * 0.28})` }}
      />

      {/* Real specular lens highlight + deep rim shadow */}
      <span className="pointer-events-none absolute inset-8 rounded-full bg-linear-to-b from-white/45 via-white/5 to-transparent opacity-85" />
      <span className="pointer-events-none absolute inset-8 rounded-full shadow-[inset_0_-24px_50px_-20px_rgba(0,0,0,0.85),inset_0_2px_2px_rgba(255,255,255,0.45)]" />

      {/* Audio level meter ring */}
      <svg
        className="absolute inset-0 h-full w-full -rotate-90 opacity-70"
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
        {active && level > 0.01 && (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="url(#orbGradient)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(10, level * 289)} 289`}
            className="transition-all duration-150"
          />
        )}
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-purple)" />
            <stop offset="50%" stopColor="var(--brand-blue)" />
            <stop offset="100%" stopColor="var(--brand-cyan)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Connecting dots */}
      {thinking && (
        <span className="relative z-10 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full bg-white shadow-md animate-think-dot"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      )}

      {/* Tactile hover ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full border border-white/20 opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100" />
    </button>
  );
}
