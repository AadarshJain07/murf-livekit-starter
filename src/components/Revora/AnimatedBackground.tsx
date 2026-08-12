import { useMemo } from "react";

/** Decorative animated gradient blobs, grid, floating particles and subtle grain. */
export function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        size: 2 + ((i * 7) % 5),
        delay: (i * 1.3) % 18,
        duration: 16 + ((i * 5) % 14),
        opacity: 0.2 + ((i % 5) * 0.1),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* deep radial vignette */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, transparent 0%, color-mix(in oklab, var(--background) 80%, black) 75%)",
        }}
      />

      {/* gradient blobs */}
      <div className="absolute -left-48 -top-48 h-[42rem] w-[42rem] rounded-full bg-brand-blue/25 blur-[140px] animate-float-slow" />
      <div className="absolute -right-40 top-16 h-[36rem] w-[36rem] rounded-full bg-brand-purple/28 blur-[130px] animate-float-slow [animation-delay:-6s]" />
      <div className="absolute bottom-[-14rem] left-1/4 h-[38rem] w-[38rem] rounded-full bg-brand-cyan/18 blur-[150px] animate-float-slow [animation-delay:-11s]" />
      <div className="absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/10 blur-[120px] animate-pulse-soft" />

      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, white 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, white 22%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 25%, transparent 80%)",
        }}
      />

      {/* subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 rounded-full bg-white"
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
