import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border border-[var(--color-border)] bg-white/90 px-4 py-3 text-sm placeholder:text-[var(--color-text-faint)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent)]/15 focus-visible:border-[var(--color-accent)]/40 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
