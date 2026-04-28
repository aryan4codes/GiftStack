"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
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
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-[var(--color-border)]"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-[var(--color-text-muted)] rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-9 h-9",
          "[&:has([aria-selected])]:bg-[var(--color-accent-soft)] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-neutral-100"
        ),
        day_selected:
          "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)] hover:text-white focus:bg-[var(--color-accent)]",
        day_today: "bg-neutral-100",
        day_outside: "text-[var(--color-text-faint)] opacity-50",
        day_disabled: "text-[var(--color-text-faint)] opacity-30",
        day_range_middle:
          "aria-selected:bg-[var(--color-accent-soft)] aria-selected:text-[var(--color-text)]",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
