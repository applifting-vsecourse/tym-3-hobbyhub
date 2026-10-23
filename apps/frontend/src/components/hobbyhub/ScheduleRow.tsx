import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { missingCount, type Capacity } from "@/components/hobbyhub/capacity"
import { EventPhoto } from "@/components/hobbyhub/EventPhoto"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { cn } from "@/lib/utils"

type ScheduleRowProps = Capacity & {
  time: string
  title: string
  /** Place and level, e.g. "Hala ZŠ Dolní, pokročilí". */
  subtitle: string
  /** Without a photo the row shows the activity's icon on a muted square, like `EventCard`. */
  photo?: { src: string; alt: string }
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the square empty. */
  activity?: string
  className?: string
}

/**
 * Řádek rozpisu — the main item of an event listing: time, a small photo,
 * title with place and level, small seats and a status word. No card, no
 * shadow; rows are separated by a hairline.
 */
export function ScheduleRow({
  time,
  title,
  subtitle,
  photo,
  activity,
  className,
  ...capacity
}: ScheduleRowProps) {
  const { t } = useTranslation()
  const missing = missingCount(capacity)

  return (
    <div className={cn("flex items-start gap-3 border-t border-border py-4", className)}>
      {/* The photo sits under the time, so the title keeps the row's width
          next to the seats even in the narrow list beside the map. */}
      <div className="flex w-22 shrink-0 flex-col gap-2">
        <p className="typo-time text-foreground">{time}</p>
        {photo ? (
          <EventPhoto
            src={photo.src}
            alt={photo.alt}
            className="h-14"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-14 w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            {activity && isActivityKey(activity) ? (
              <ActivityIcon
                activity={activity}
                className="size-6"
              />
            ) : null}
          </div>
        )}
      </div>
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
          {missing > 0
            ? t("hobbyhub.capacity.missing", { count: missing })
            : t("hobbyhub.capacity.full")}
        </p>
      </div>
    </div>
  )
}
