"use client";

import * as React from "react";
import { DayPicker, DayFlag, SelectionState, UI } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        [UI.Root]: cn(
          "w-full max-w-none rounded-none border-0 bg-transparent p-0 shadow-none [--rdp-accent-color:theme(colors.orange.500)] [--rdp-accent-background-color:theme(colors.orange.100)] [--rdp-outside-opacity:0.35] [--rdp-disabled-opacity:0.28]",
        ),
        [UI.Months]: "w-full flex-col gap-6",
        [UI.Month]: "w-full space-y-0",
        [UI.MonthCaption]: "relative mb-4 flex h-12 shrink-0 items-center justify-center px-10",
        [UI.CaptionLabel]: "font-display text-base font-semibold tracking-tight text-[var(--color-ink)]",
        [UI.Nav]: "absolute inset-x-0 top-1 flex justify-between px-1",
        [UI.PreviousMonthButton]: cn(
          "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm transition-colors",
          "hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        ),
        [UI.NextMonthButton]: cn(
          "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm transition-colors",
          "hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        ),
        [UI.MonthGrid]: "w-full min-w-[280px]",
        [UI.Weekdays]: "mb-3 grid grid-cols-7 gap-1 px-0.5 text-center",
        [UI.Weekday]: cn(
          "flex items-center justify-center py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
          "text-[var(--color-text-muted)]",
        ),
        [UI.Weeks]: "w-full space-y-2",
        [UI.Week]: "grid w-full grid-cols-7 gap-1.5",
        [UI.Day]: "relative flex h-[2.625rem] w-full items-center justify-center p-0 text-center [&:has([aria-selected=true])]:rounded-xl",
        [UI.DayButton]: cn(
          "relative z-[1] inline-flex size-11 max-h-11 max-w-11 shrink-0 items-center justify-center rounded-xl text-[0.9rem] font-medium",
          "transition-[colors,transform,box-shadow] duration-200",
          "text-[var(--color-ink)] hover:bg-neutral-100/95",
          "focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        ),
        [SelectionState.selected]:
          "!bg-[var(--color-accent)] text-white hover:!bg-[var(--color-accent)] hover:!text-white shadow-md ring-2 ring-orange-400/30",
        [DayFlag.today]: "font-semibold text-[var(--color-accent)] not-[[data-selected=true]]:underline decoration-2 underline-offset-2",
        [DayFlag.outside]: "text-[var(--color-text-faint)] opacity-55",
        [DayFlag.disabled]: "opacity-25 pointer-events-none",
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
