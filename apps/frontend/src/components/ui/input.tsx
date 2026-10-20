import * as React from "react"

import { cn } from "@/lib/utils"

const DATE_TIME_TYPES = new Set(["date", "time", "datetime-local", "month", "week"])

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border border-input bg-card px-3.5 py-3 typo-body text-foreground transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        // iOS Safari draws date and time fields natively: taller than h-12,
        // wider than their column and centred. Without the native appearance
        // they keep the field's size; the value stays left like other text.
        type !== undefined &&
          DATE_TIME_TYPES.has(type) &&
          "appearance-none [&::-webkit-date-and-time-value]:text-left",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
