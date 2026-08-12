type Props = {
  /** 0 - 1 audio level. */
  level: number;
  /** true while the agent is speaking (drives its own rhythm). */
  speaking: boolean;
  active: boolean;
  bars?: number;
  className?: string;
};

/** Live waveform: reacts to mic level, self-animates while the agent speaks. */
export function Waveform({ level, speaking, active, bars = 40, className = "" }: Props) {
  return (
    <div
      className={`flex h-16 items-center justify-center gap-[3px] transition-opacity duration-500 ${
        active || speaking ? "opacity-100" : "opacity-60"
      } ${className}`}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const center = 1 - Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2);
        const shape = 0.25 + center * 0.75;
        const baseHeight = active ? 10 + level * 52 * shape : 6 + shape * 8;
        const height = speaking ? baseHeight * (0.85 + Math.random() * 0.3) : baseHeight;
        const isCenter = center > 0.7;

        return (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-[height] duration-100 ease-out ${
              speaking && isCenter ? "bg-gradient-to-t from-brand-cyan via-brand-purple to-brand-blue" : "bg-gradient-brand"
            }`}
            style={{
              height: `${Math.max(5, height)}px`,
              opacity: active ? 0.5 + shape * 0.5 : 0.2 + shape * 0.25,
              boxShadow: active
                ? `0 0 ${6 + shape * 8}px -2px color-mix(in oklab, var(--brand-purple) ${40 + shape * 40}%, transparent)`
                : undefined,
              animation: speaking
                ? `wave-bar ${0.65 + (i % 5) * 0.1}s ease-in-out ${i * 0.025}s infinite`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
