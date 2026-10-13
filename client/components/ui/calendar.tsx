import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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
      className={cn("rdp-root p-3", className)}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption:
          "relative flex h-10 w-full items-center justify-center px-10",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "z-10 h-8 w-8 bg-background p-0 opacity-80 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "z-10 h-8 w-8 bg-background p-0 opacity-80 hover:opacity-100",
        ),
        chevron: "h-4 w-4",
        month_grid: "w-full border-collapse",
        weekdays: "mb-1 flex",
        weekday:
          "flex h-9 w-9 items-center justify-center text-[0.75rem] font-medium text-muted-foreground",
        weeks: "flex flex-col gap-1",
        week: "flex w-full",
        day: "relative flex h-9 w-9 items-center justify-center p-0 text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-xl p-0 font-normal transition aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground",
        today:
          "[&>button]:bg-secondary [&>button]:text-primary [&>button]:font-semibold",
        outside:
          "opacity-45 [&>button]:text-muted-foreground aria-selected:opacity-40",
        disabled:
          "opacity-40 [&>button]:text-muted-foreground [&>button]:hover:bg-transparent",
        hidden: "invisible",
        range_start: "[&>button]:rounded-l-xl",
        range_end: "[&>button]:rounded-r-xl",
        range_middle:
          "[&>button]:rounded-none [&>button]:bg-secondary [&>button]:text-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return (
            <Icon className={cn("h-4 w-4", chevronClass)} {...chevronProps} />
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
