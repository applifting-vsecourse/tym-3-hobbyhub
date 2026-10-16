import { useTranslation } from "react-i18next"

import { capacityLabel, seatStates, type Capacity } from "@/components/hobbyhub/capacity"
import { Seat } from "@/components/hobbyhub/Seat"
import { cn } from "@/lib/utils"

type SeatMeterProps = Capacity & {
  size?: "md" | "sm"
  className?: string
}

/**
 * Ukazatel míst — capacity drawn as seats at a table instead of a percentage.
 * Long rows break into two even rows, the way the Figma variants do.
 */
export function SeatMeter({ size = "md", className, ...capacity }: SeatMeterProps) {
  const { t } = useTranslation()
  const states = seatStates(capacity)
  const singleRowLimit = size === "md" ? 10 : 6
  const columns = states.length <= singleRowLimit ? states.length : Math.ceil(states.length / 2)

  return (
    <div
      role="img"
      aria-label={capacityLabel(t, capacity)}
      className={cn("grid w-fit", size === "md" ? "gap-1.5" : "gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}
    >
      {states.map((state, index) => (
        <Seat
          // Seats have no identity beyond their position.
          key={index}
          state={state}
          size={size}
        />
      ))}
    </div>
  )
}
