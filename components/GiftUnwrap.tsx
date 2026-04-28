"use client";

import * as React from "react";
import { Heart, Sparkles } from "lucide-react";

const SPARKLE_COUNT = 16;

type Phase = "idle" | "opening" | "done";

export function GiftUnwrap({
  senderName,
  occasion,
  onUnwrap,
  onComplete,
}: {
  senderName?: string;
  occasion?: string;
  /** Fires the moment the user taps — kick off API calls in parallel with the animation. */
  onUnwrap: () => void;
  /** Fires after the animation has visually completed; parent can unmount us now. */
  onComplete: () => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const reducedMotion = React.useRef(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "matchMedia" in window) {
      reducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
  }, []);

  React.useEffect(() => {
    if (phase !== "opening") return;
    const ms = reducedMotion.current ? 250 : 1500;
    const t = window.setTimeout(() => {
      setPhase("done");
      onComplete();
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase, onComplete]);

  function handleClick() {
    if (phase !== "idle") return;
    setPhase("opening");
    onUnwrap();
  }

  const sparkles = React.useMemo(() => {
    return Array.from({ length: SPARKLE_COUNT }).map((_, i) => {
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
      const radius = 200 + ((i * 37) % 80);
      return {
        i,
        tx: Math.cos(angle) * radius,
        ty: Math.sin(angle) * radius - 30,
        size: 6 + ((i * 11) % 8),
        delay: (i % 6) * 35,
      };
    });
  }, []);

  return (
    <div
      className={`gift-unwrap-overlay phase-${phase}`}
      role="dialog"
      aria-label="Unwrap your gift"
      aria-modal="true"
    >
      <div className="gift-unwrap-glow-bg" aria-hidden />
      <div className="gift-unwrap-content">
        <p className="gift-unwrap-eyebrow">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          You&rsquo;ve received a gift
        </p>

        {senderName ? (
          <p className="gift-unwrap-from">
            From <span className="gift-unwrap-name">{senderName}</span>
            {occasion ? (
              <>
                {" · "}
                <span className="capitalize">
                  {occasion.replace(/_/g, " ")}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleClick}
          disabled={phase !== "idle"}
          className={`gift-unwrap-button phase-${phase}`}
          aria-label="Tap to unwrap your gift"
        >
          <span className="gift-unwrap-glow" aria-hidden />

          <span className="gift-box" aria-hidden>
            <span className="gift-shine" />
            <span className="gift-base">
              <span className="gift-ribbon-h gift-ribbon-h-base" />
            </span>
            <span className="gift-ribbon-v" />
            <span className="gift-lid">
              <span className="gift-ribbon-h gift-ribbon-h-lid" />
              <span className="gift-bow">
                <span className="gift-bow-loop left" />
                <span className="gift-bow-loop right" />
                <span className="gift-bow-knot" />
                <span className="gift-bow-tail left" />
                <span className="gift-bow-tail right" />
              </span>
            </span>
          </span>

          <span className="gift-sparkle-field" aria-hidden>
            {sparkles.map((s) => {
              const style = {
                "--tx": `${s.tx}px`,
                "--ty": `${s.ty}px`,
                "--delay": `${s.delay}ms`,
                "--size": `${s.size}px`,
              } as React.CSSProperties;
              return (
                <span key={s.i} className="gift-sparkle" style={style} />
              );
            })}
          </span>
        </button>

        <p className="gift-unwrap-prompt" aria-live="polite">
          {phase === "idle" ? (
            <>
              <Heart className="h-3 w-3 text-[var(--color-accent)]" aria-hidden />
              Tap the box to unwrap
            </>
          ) : phase === "opening" ? (
            "Opening…"
          ) : (
            ""
          )}
        </p>
      </div>
    </div>
  );
}
