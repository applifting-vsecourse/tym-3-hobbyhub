import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type SeatState = "taken" | "missing" | "free"

const seatVariants = cva("inline-block shrink-0 rounded-full", {
  variants: {
    state: {
      taken: "bg-primary",
      missing: "border-2 border-dashed border-signal",
      free: "border-2 border-input",
    },
    size: {
      md: "size-5.5",
      sm: "size-2.5",
      loader: "size-4",
    },
  },
  defaultVariants: { state: "taken", size: "md" },
})

type SeatProps = VariantProps<typeof seatVariants> & { className?: string }

/**
 * Místo — one unit of capacity, like a seat at a table. Filled is taken,
 * dashed is missing (counts towards the minimum), empty is free above the
 * minimum. Decorative: the parent states the numbers in text.
 */
export function Seat({ state, size, className }: SeatProps) {
  return (
    <span
      aria-hidden
      data-slot="seat"
      data-state={state}
      className={cn(seatVariants({ state, size }), className)}
    />
  )
}
