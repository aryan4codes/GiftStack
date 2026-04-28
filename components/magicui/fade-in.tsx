"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function FadeIn({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn("animate-fade-in-up", className)}
    >
      {children}
    </div>
  );
}
