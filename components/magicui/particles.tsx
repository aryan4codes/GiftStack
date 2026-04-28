"use client";

import * as React from "react";

export function ParticlesBurst({ durationMs = 2200 }: { durationMs?: number }) {
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  if (!show) return null;

  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left: `${(i * 7) % 100}%`,
    delay: `${(i % 8) * 40}ms`,
    rotate: `${(i * 13) % 360}deg`,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-1/4 h-2 w-2 rounded-sm bg-[var(--color-accent)] opacity-90"
          style={{
            left: p.left,
            animation: `fade-in-up 1.8s ease-out forwards`,
            transform: `translateY(0) rotate(${p.rotate})`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
