import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { missingCount } from "@/components/hobbyhub/capacity"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { YourSeat } from "@/components/hobbyhub/YourSeat"

import type { EventDetail as EventDetailData } from "@/features/event/api/eventSchemas"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

// Mirrors the server: below this many included people the mix stays hidden.
const MIN_STATS_PARTICIPANTS = 3

type EventDetailProps = {
  event: EventDetailData
  /** Display name of the activity; the activity feature owns the translation. */
  activityLabel: string
  /** The button that takes a seat. Hidden for events nobody can ask to join. */
  joinAction: ReactNode
  /** Injectable so "today" and "over" are stable in tests. */
  now?: Date
}

type EventState = "open" | "full" | "cancelled" | "finished"

function eventState(event: EventDetailData, now: Date): EventState {
  if (event.status === "CANCELLED") return "cancelled"
  if (event.status !== "PUBLISHED" || event.endAt < now) return "finished"
  if (event.takenCount >= event.maxParticipants) return "full"
  return "open"
}

function StateBadge({ state }: { state: Exclude<EventState, "open"> }) {
  const { t } = useTranslation()
  const status = { cancelled: "rejected", finished: "neutral", full: "approved" } as const

  return <StatusBadge status={status[state]}>{t(`events.detail.state.${state}`)}</StatusBadge>
}

export function EventDetail({
  event,
  activityLabel,
  joinAction,
  now = new Date(),
}: EventDetailProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const state = eventState(event, now)
  const missing = missingCount({ taken: event.takenCount, min: event.minParticipants })
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  })
  // Activity is shown on its own line above, so only place and level here.
  const place = eventMeta(t, event, "")
  const { stats } = event
  const when = [
    `${eventDay(t, event.startAt, now, locale)} ${eventTime(event.startAt, locale)}–${eventTime(event.endAt, locale)}`,
    place,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-8">
      <header className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <p className="flex items-center gap-2 typo-label text-muted-foreground">
          {isActivityKey(event.activity.icon) ? (
            <ActivityIcon
              activity={event.activity.icon}
              className="size-5"
            />
          ) : null}
          {activityLabel}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="typo-h1 text-foreground">{event.title}</h1>
          {state !== "open" ? <StateBadge state={state} /> : null}
        </div>
        <p className="typo-body text-muted-foreground">{when}</p>
        <p className="typo-body text-muted-foreground">
          {t("events.detail.organizer", { name: event.organizerName })}
        </p>
        {state !== "open" ? (
          <p className="typo-body text-foreground">{t(`events.detail.state.${state}Text`)}</p>
        ) : null}
      </header>

      <aside
        aria-labelledby="roster-heading"
        className="flex h-fit flex-col gap-4 rounded-xl bg-signal p-4 text-signal-foreground lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="roster-heading"
            className="typo-h3"
          >
            {t("events.detail.roster")}
          </h2>
          {missing > 0 && state === "open" ? (
            <span className="rounded-full bg-signal-foreground px-2.5 py-0.75 typo-small text-signal">
              {t("events.detail.missingToMin", { count: missing })}
            </span>
          ) : null}
        </div>
        <RosterSeats
          size="lg"
          surface="dark"
          taken={event.takenCount}
          capacity={event.maxParticipants}
        />
        <p className="typo-small text-signal-soft">
          {t("events.detail.seats", { taken: event.takenCount, total: event.maxParticipants })}
        </p>
        {state === "open" ? (
          <YourSeat
            surface="dark"
            description={t(
              event.approvalMode === "MANUAL"
                ? "events.detail.approvalManual"
                : "events.detail.approvalAutomatic",
            )}
            action={joinAction}
          />
        ) : null}
      </aside>

      <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
        <p className="typo-body-lg break-words whitespace-pre-line text-foreground">
          {event.description}
        </p>

        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="typo-label-lg text-foreground">
            {t(
              event.venueType === "ONLINE"
                ? "events.detail.address.online"
                : "events.detail.address.private",
            )}
          </h2>
          <dl className="flex flex-col gap-1 typo-small text-muted-foreground">
            {event.contributionAmount !== null ? (
              <div className="flex gap-2">
                <dt className="text-foreground">{t("events.detail.contribution")}</dt>
                <dd>{money.format(event.contributionAmount)}</dd>
              </div>
            ) : null}
            {event.equipment ? (
              <div className="flex gap-2">
                <dt className="text-foreground">{t("events.detail.equipment")}</dt>
                <dd className="whitespace-pre-line">{event.equipment}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="typo-h3 text-foreground">{t("events.detail.stats.title")}</h2>
          {stats ? (
            <>
              <ul className="flex flex-col gap-1 typo-body text-foreground">
                {stats.medianAge !== null ? (
                  <li>{t("events.detail.stats.medianAge", { count: stats.medianAge })}</li>
                ) : null}
                {stats.gender ? (
                  <li>
                    {t("events.detail.stats.gender", {
                      male: stats.gender.male,
                      female: stats.gender.female,
                    })}
                  </li>
                ) : null}
              </ul>
              <p className="typo-small text-muted-foreground">
                {t("events.detail.stats.coverage", {
                  included: stats.included,
                  total: stats.total,
                })}
              </p>
            </>
          ) : (
            <p className="typo-small text-muted-foreground">
              {t("events.detail.stats.hidden", { count: MIN_STATS_PARTICIPANTS })}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
