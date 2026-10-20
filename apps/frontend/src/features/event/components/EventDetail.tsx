import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import LevelIcon from "@/assets/ui-icons/level.svg?react"
import MapPinIcon from "@/assets/ui-icons/map-pin.svg?react"
import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { missingCount } from "@/components/hobbyhub/capacity"
import { EventPhoto } from "@/components/hobbyhub/EventPhoto"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { YourSeat } from "@/components/hobbyhub/YourSeat"
import { cn } from "@/lib/utils"

import type { EventDetail as EventDetailData } from "@/features/event/api/eventSchemas"
import { formatContribution } from "@/features/event/lib/eventDateTime"
import { eventDay, eventEnd, eventPlace, eventTime } from "@/features/event/lib/eventLabels"

type EventDetailProps = {
  event: EventDetailData
  /** Display name of the activity; the activity feature owns the translation. */
  activityLabel: string
  /** The button that takes a seat. Hidden for events nobody can ask to join. */
  joinAction: ReactNode
  /** Link to the group that organizes the event; absent when none does. */
  groupLink?: ReactNode
  /** Injectable so "today" and "over" are stable in tests. */
  now?: Date
}

type EventState = "open" | "full" | "cancelled" | "finished" | "notHeld"

function eventState(event: EventDetailData, now: Date): EventState {
  if (event.status === "CANCELLED") return "cancelled"
  if (event.status === "NOT_HELD") return "notHeld"
  if (event.status !== "PUBLISHED" || event.endAt < now) return "finished"
  if (event.takenCount >= event.maxParticipants) return "full"
  return "open"
}

function StateBadge({ state }: { state: Exclude<EventState, "open"> }) {
  const { t } = useTranslation()
  const status = {
    cancelled: "rejected",
    finished: "neutral",
    notHeld: "neutral",
    full: "approved",
  } as const

  return <StatusBadge status={status[state]}>{t(`events.detail.state.${state}`)}</StatusBadge>
}

export function EventDetail({
  event,
  activityLabel,
  joinAction,
  groupLink,
  now = new Date(),
}: EventDetailProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const state = eventState(event, now)
  const missing = missingCount({ taken: event.takenCount, min: event.minParticipants })
  const { stats } = event
  const day = eventDay(t, event.startAt, now, locale)
  const isToday = day === t("events.day.today")
  const where = eventPlace(t, event)
  // A public venue is named above; the others stay vague until approval.
  const addressNote =
    event.venueType === "ONLINE"
      ? { label: t("events.detail.linkLabel"), value: t("events.detail.address.online") }
      : event.venueType === "PRIVATE_VENUE"
        ? { label: t("events.detail.addressLabel"), value: t("events.detail.address.private") }
        : null
  const practical = [
    addressNote,
    event.contributionAmount !== null
      ? {
          label: t("events.detail.contribution"),
          value: [formatContribution(event.contributionAmount, locale), event.contributionNote]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    event.equipment ? { label: t("events.detail.equipment"), value: event.equipment } : null,
  ].filter((row) => row !== null)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-8 lg:gap-y-8">
      <header className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        {event.imageUrl ? (
          // Decorative: the title below says what the event is.
          <EventPhoto
            src={event.imageUrl}
            alt=""
            rounding="xl"
            className="h-48 md:h-72"
          />
        ) : null}
        <div className="flex flex-col gap-2">
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
          {state !== "open" ? (
            <p className="typo-body text-foreground">{t(`events.detail.state.${state}Text`)}</p>
          ) : null}
        </div>

        {/* When and where: the time is the main fact, so it is the one big thing. */}
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <p className={cn("typo-small", isToday ? "text-signal-ink" : "text-muted-foreground")}>
              {day}
            </p>
            <p className="typo-time text-foreground">{eventTime(event.startAt, locale)}</p>
            <p className="typo-small text-muted-foreground">
              {t("hobbyhub.eventDetail.until", {
                time: eventEnd(event.startAt, event.endAt, locale),
              })}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 pt-5 typo-body text-muted-foreground">
            {where ? (
              <li className="flex items-center gap-2">
                <MapPinIcon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {where}
              </li>
            ) : null}
            {event.level ? (
              <li className="flex items-center gap-2">
                <LevelIcon
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {event.level}
              </li>
            ) : null}
          </ul>
        </div>
        <p className="typo-small text-muted-foreground">
          {t("events.detail.organizer", { name: event.organizerName })}
        </p>
        {groupLink}
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

      <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
        <p className="max-w-prose typo-body-lg break-words whitespace-pre-line text-foreground">
          {event.description}
        </p>

        {practical.length > 0 ? (
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-border pt-4 typo-body">
            {practical.map(({ label, value }) => (
              <div
                key={label}
                className="col-span-2 grid grid-cols-subgrid"
              >
                <dt className="typo-label text-foreground">{label}</dt>
                <dd className="break-words whitespace-pre-line text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="typo-h3 text-foreground">{t("events.detail.stats.title")}</h2>
          {stats ? (
            <>
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                {stats.medianAge !== null ? (
                  <div className="flex flex-col-reverse">
                    <dt className="typo-small text-muted-foreground">
                      {t("events.detail.stats.medianAgeLabel")}
                    </dt>
                    <dd className="typo-numeral text-foreground">{stats.medianAge}</dd>
                  </div>
                ) : null}
                {stats.gender ? (
                  <div className="flex flex-col-reverse">
                    <dt className="typo-small text-muted-foreground">
                      {t("events.detail.stats.genderLabel")}
                    </dt>
                    <dd className="typo-numeral text-foreground">
                      {stats.gender.male} : {stats.gender.female}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="typo-small text-muted-foreground">
                {t("events.detail.stats.coverage", {
                  included: stats.included,
                  total: stats.total,
                })}
              </p>
            </>
          ) : (
            <p className="typo-small text-muted-foreground">
              {t("events.detail.stats.hidden", { count: event.statsMinParticipants })}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
