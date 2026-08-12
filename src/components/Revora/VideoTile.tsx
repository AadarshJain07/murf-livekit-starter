import { useEffect, useRef } from "react";

interface VideoTileProps {
  track: MediaStreamTrack;
  label: string;
  className?: string;
}

/** Small glass preview tile for the local camera or shared screen. */
export function VideoTile({ track, label, className }: VideoTileProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [track]);

  return (
    <div
      className={`glass-strong animate-rise relative overflow-hidden rounded-2xl shadow-[var(--glow-brand)] ${className ?? ""}`}
    >
      <video
        ref={ref}
        muted
        playsInline
        autoPlay
        className="h-full w-full bg-black/40 object-cover"
      />
      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
