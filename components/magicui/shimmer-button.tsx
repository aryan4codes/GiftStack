"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ShimmerButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]",
        "animate-shimmer-bg",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
