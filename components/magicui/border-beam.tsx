"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function BorderBeam({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-xl p-[2px]",
        className
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-[inherit] opacity-75"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(252,128,25,0.9), transparent)",
          animation: "shimmer 2s linear infinite",
        }}
      />
    </div>
  );
}
