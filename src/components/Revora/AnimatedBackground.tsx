import { useMemo } from "react";

/** Ambient background with warm organic glow, soft radial vignette, and subtle particles. */
export function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: (i * 41 + 12) % 96,
        size: 2 + ((i * 5) % 4),
        delay: (i * 1.5) % 16,
        duration: 18 + ((i * 7) % 12),
        opacity: 0.15 + ((i % 4) * 0.08),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Dark background base */}
      <div className="absolute inset-0 bg-background" />

      {/* Deep cinematic vignette */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, transparent 0%, color-mix(in oklab, var(--background) 92%, black) 80%)",
        }}
      />

      {/* Ambient soft glow fields */}
      <div className="absolute -left-32 -top-32 h-[45rem] w-[45rem] rounded-full bg-brand-purple/15 blur-[160px] animate-float-slow" />
      <div className="absolute -right-32 top-20 h-[40rem] w-[40rem] rounded-full bg-brand-blue/18 blur-[150px] animate-float-slow [animation-delay:-7s]" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[42rem] w-[42rem] rounded-full bg-brand-cyan/12 blur-[170px] animate-float-slow [animation-delay:-12s]" />
      <div className="absolute top-1/3 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/8 blur-[140px] animate-pulse-soft" />

      {/* Subtle organic noise layer */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Soft floating dust particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `particle-drift ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
