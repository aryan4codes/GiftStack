import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        secondary:
          "border-transparent bg-blue-50 text-blue-800",
        success:
          "border-transparent bg-emerald-50 text-emerald-800",
        muted:
          "border-transparent bg-neutral-100 text-[var(--color-text-muted)]",
        accent:
          "border-transparent bg-[var(--color-accent-soft)] text-[#b35a0a]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
