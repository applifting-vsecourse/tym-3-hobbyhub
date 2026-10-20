import { useTranslation } from "react-i18next"

import { isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"
import { missingCount } from "@/components/hobbyhub/capacity"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"

import { formatEventDay, formatEventTime } from "@/features/event/lib/eventDateTime"

/** Above this the seat meter stops being readable; the text summary stays. */
const SEAT_METER_LIMIT = 30

type EventPreviewProps = {
  readonly activityIcon: string
  readonly title: string
  readonly start: Date | null
  readonly place: string
  readonly taken: number
  readonly min: number
  readonly max: number
}

/**
 * "Takto uvidí akci ostatní" — the card of the form's last step and desktop
 * sidebar, drawn from the values typed so far.
 */
export function EventPreview({
  activityIcon,
  title,
  start,
  place,
  taken,
  min,
  max,
}: EventPreviewProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? "cs"
  const capacity = { taken, min, max: Math.max(min, max) }
  const missing = missingCount(capacity)

  return (
    <section aria-label={t("events.form.previewTitle")}>
      <p className="typo-label text-muted-foreground">{t("events.form.previewTitle")}</p>
      <article className="mt-2 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex shrink-0 flex-col">
            <p className="typo-time text-foreground">
              {start ? formatEventTime(start, locale) : t("events.preview.noTime")}
            </p>
            {start ? (
              <p className="typo-small text-muted-foreground">{formatEventDay(start, locale)}</p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate typo-title text-foreground">
              {title || t("events.preview.untitled")}
            </h3>
            <p className="truncate typo-small text-muted-foreground">
              {place || t("events.preview.noPlace")}
            </p>
          </div>
          {isActivityKey(activityIcon) ? <ActivityToken activity={activityIcon} /> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-accent px-4 py-3">
          {capacity.max <= SEAT_METER_LIMIT ? (
            <SeatMeter
              size="sm"
              {...capacity}
            />
          ) : (
            <span className="typo-small text-accent-foreground">
              {t("events.preview.occupied", { taken, total: capacity.max })}
            </span>
          )}
          {missing > 0 ? (
            <span className="shrink-0 rounded-full bg-signal px-3 py-1 typo-small text-signal-foreground">
              {t("hobbyhub.capacity.missing", { count: missing })}
            </span>
          ) : (
            <StatusBadge status="approved">{t("hobbyhub.capacity.full")}</StatusBadge>
          )}
        </div>
      </article>
    </section>
  )
}
