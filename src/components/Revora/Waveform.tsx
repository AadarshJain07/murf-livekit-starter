type Props = {
  /** 0 - 1 audio level. */
  level: number;
  /** true while the agent is speaking (drives its own rhythm). */
  speaking: boolean;
  active: boolean;
  bars?: number;
  className?: string;
};

/** Live acoustic waveform visualizer: reacts to mic level, self-animates when agent speaks. */
export function Waveform({ level, speaking, active, bars = 36, className = "" }: Props) {
  return (
    <div
      className={`flex h-14 items-center justify-center gap-[4px] transition-opacity duration-500 ${
        active || speaking ? "opacity-100" : "opacity-50"
      } ${className}`}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const center = 1 - Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2);
        const shape = 0.2 + center * 0.8;
        const baseHeight = active ? 8 + level * 48 * shape : 5 + shape * 7;
        const height = speaking ? baseHeight * (0.8 + Math.random() * 0.4) : baseHeight;
        const isCenter = center > 0.65;

        return (
          <span
            key={i}
            className={`w-[3.5px] rounded-full transition-[height,opacity] duration-150 ease-out ${
              speaking && isCenter
                ? "bg-gradient-to-t from-brand-purple via-brand-blue to-brand-cyan"
                : "bg-gradient-brand"
            }`}
            style={{
              height: `${Math.max(4, height)}px`,
              opacity: active ? 0.6 + shape * 0.4 : 0.25 + shape * 0.25,
              boxShadow: active
                ? `0 0 ${6 + shape * 6}px -1px color-mix(in oklab, var(--brand-purple) ${35 + shape * 45}%, transparent)`
                : undefined,
              animation: speaking
                ? `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.02}s infinite`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
