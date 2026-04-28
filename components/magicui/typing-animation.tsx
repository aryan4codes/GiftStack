"use client";

import * as React from "react";

export function TypingAnimation({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [shown, setShown] = React.useState("");

  React.useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 18);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <p className={className}>
      {shown}
      <span className="inline-block w-0.5 h-[1em] bg-[var(--color-accent)] align-middle ml-0.5 animate-pulse" />
    </p>
  );
}
