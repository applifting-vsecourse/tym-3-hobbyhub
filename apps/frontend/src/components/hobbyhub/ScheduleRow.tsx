import { missingCount, type Capacity } from "@/components/hobbyhub/capacity"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { cn } from "@/lib/utils"

type ScheduleRowProps = Capacity & {
  time: string
  title: string
  /** Place and level, e.g. "Hala ZŠ Dolní, pokročilí". */
  subtitle: string
  className?: string
}

/**
 * Řádek rozpisu — the main item of an event listing: time, title with place
 * and level, small seats and a status word. No card, no shadow; rows are
 * separated by a hairline.
 */
export function ScheduleRow({ time, title, subtitle, className, ...capacity }: ScheduleRowProps) {
  const missing = missingCount(capacity)

  return (
    <div className={cn("flex items-start gap-3 border-t border-border py-4", className)}>
      <p className="w-22 shrink-0 typo-time text-foreground">{time}</p>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="typo-title text-foreground">{title}</h3>
        <p className="typo-small text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <SeatMeter
          size="sm"
          {...capacity}
        />
        <p className={cn("typo-small", missing > 0 ? "text-signal-ink" : "text-success-ink")}>
          {missing > 0 ? `chybí ${missing}` : "naplněno"}
        </p>
      </div>
    </div>
  )
}
