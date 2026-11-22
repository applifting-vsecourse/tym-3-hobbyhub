import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Trans, useTranslation } from "react-i18next"

import LevelIcon from "@/assets/ui-icons/level.svg?react"
import MapPinIcon from "@/assets/ui-icons/map-pin.svg?react"
import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { missingCount } from "@/components/hobbyhub/capacity"
import { EventPhoto } from "@/components/hobbyhub/EventPhoto"
import { RatingScore } from "@/components/hobbyhub/RatingScore"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { YourSeat } from "@/components/hobbyhub/YourSeat"
import { cn } from "@/lib/utils"

import type { EventDetail as EventDetailData } from "@/features/event/api/eventSchemas"
import { formatContribution } from "@/features/event/lib/eventDateTime"
import {
  eventClock,
  eventDate,
  eventDay,
  eventEnd,
  eventPlace,
} from "@/features/event/lib/eventLabels"

type EventDetailProps = {
  event: EventDetailData
  /** Display name of the activity; the activity feature owns the translation. */
  activityLabel: string
  /** The button that takes a seat. Hidden for events nobody can ask to join. */
  joinAction: ReactNode
  /** Edit and cancel, for the organizer of an event that has not started. */
  organizerActions?: ReactNode
  /** Names the organizer as a link to their profile: only signed-in people can open it. */
  isOrganizerLinked?: boolean
  /** Copy the public link; shown to everyone while the event can still be joined (not once it is full). */
  shareAction?: ReactNode
  /**
   * "Zajímá mě" (#231): save the event to one's list, or take it off. The page
   * decides when it is offered; shown beside the title whatever the state.
   */
  interestAction?: ReactNode
  /**
   * The signed-in person's own place (their request, their seat, their event).
   * Shown instead of the free seat, whatever state the event is in, so a
   * pending request can still be withdrawn once the event fills up.
   */
  ownRequest?: ReactNode
  /**
   * #232: "Hlídat volné místo" on a full event, under the person's own place
   * or where the free seat would be. The page decides when it is offered.
   */
  freeSpotWatch?: ReactNode
  /**
   * The exact place and the contacts, for the organizer and people with a seat.
   * Absent for everyone else, who is told when they appear instead.
   */
  participantInfo?: ReactNode
  /**
   * #218: the exact place for everyone else, when the organizer made the
   * address public. The contacts still wait for a seat.
   */
  publicPlace?: ReactNode
  /** "Nahlásit akci" (#240), for a signed-in person who does not organize it. */
  reportAction?: ReactNode
  /**
   * The way to rate the organizer (#234), for someone who had a seat while the
   * rating period is on; then that they have rated. Under the event's state.
   */
  ratingPrompt?: ReactNode
  /** Injectable so "today" and "over" are stable in tests. */
  now?: Date
}

type EventState = "open" | "full" | "started" | "cancelled" | "finished" | "notHeld"

function eventState(event: EventDetailData, now: Date): EventState {
  if (event.status === "CANCELLED") return "cancelled"
  if (event.status === "NOT_HELD") return "notHeld"
  if (event.status !== "PUBLISHED" || event.endAt < now) return "finished"
  // F-06.1: asking to join ends when the event starts.
  if (event.startAt <= now) return "started"
  if (event.takenCount >= event.maxParticipants) return "full"
  return "open"
}

function StateBadge({ state }: { state: Exclude<EventState, "open"> }) {
  const { t } = useTranslation()
  const status = {
    cancelled: "rejected",
    finished: "neutral",
    notHeld: "neutral",
    started: "neutral",
    full: "approved",
  } as const

  return <StatusBadge status={status[state]}>{t(`events.detail.state.${state}`)}</StatusBadge>
}

export function EventDetail({
  event,
  activityLabel,
  joinAction,
  organizerActions,
  isOrganizerLinked = false,
  shareAction,
  interestAction,
  ownRequest,
  freeSpotWatch,
  participantInfo,
  publicPlace,
  reportAction,
  ratingPrompt,
  now = new Date(),
}: EventDetailProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const state = eventState(event, now)
  const isHidden = event.hiddenReason !== null
  const missing = missingCount({ taken: event.takenCount, min: event.minParticipants })
  const { stats } = event
  const day = eventDay(t, event.startAt, now, locale)
  const isToday = day === t("events.day.today")
  const where = eventPlace(t, event)
  // A public address is shown in full (#218); a hidden one stays vague until approval.
  const addressNote =
    event.venueType === "ONLINE"
      ? { label: t("events.detail.linkLabel"), value: t("events.detail.address.online") }
      : !event.isAddressPublic && !participantInfo
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
  // The gender figures add up to the taken seats, so they match the count above.
  const statFigures = stats
    ? [
        stats.medianAge !== null
          ? { label: t("events.detail.stats.medianAgeLabel"), value: stats.medianAge }
          : null,
        ...(stats.gender
          ? [
              { label: t("events.detail.stats.male"), value: stats.gender.male },
              { label: t("events.detail.stats.female"), value: stats.gender.female },
              stats.gender.unknown > 0
                ? { label: t("events.detail.stats.unknown"), value: stats.gender.unknown }
                : null,
            ]
          : []),
      ].filter((figure) => figure !== null)
    : []

  return (
    // On a large screen (#224) the photo and the roster share the right
    // column, one under the other and equally wide; the description keeps its
    // line length on the left. On a phone the photo still opens the page.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-8 lg:gap-y-8 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-x-12">
      <header className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
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
            {/* F-07.2: says why someone outside the group cannot find it. */}
            {event.visibility === "GROUP_ONLY" ? (
              <StatusBadge status="neutral">{t("events.detail.groupOnly")}</StatusBadge>
            ) : null}
            {isHidden ? (
              <StatusBadge status="neutral">{t("events.detail.hidden.badge")}</StatusBadge>
            ) : null}
            {state === "open" && !isHidden ? shareAction : null}
            {isHidden ? null : interestAction}
          </div>
          {/* #239: only the organizers get here; nobody else sees the event. */}
          {isHidden ? (
            <p className="typo-body text-foreground">
              {t("events.detail.hidden.text", { reason: event.hiddenReason })}
            </p>
          ) : null}
          {state !== "open" ? (
            <p className="typo-body text-foreground">{t(`events.detail.state.${state}Text`)}</p>
          ) : null}
          {state === "cancelled" && event.cancellationReason ? (
            <p className="typo-body text-muted-foreground">
              {[
                t("events.detail.cancellationReason", { reason: event.cancellationReason }),
                event.cancellationNote,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {ratingPrompt}
        </div>

        {/* When and where: the date is the main fact, so it is the one big thing. */}
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <p className={cn("typo-time", isToday ? "text-signal-ink" : "text-foreground")}>
              {eventDate(t, event.startAt, now, locale)}
            </p>
            <p className="typo-small text-muted-foreground">
              {eventClock(t, event.startAt, now, locale)}
            </p>
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
      </header>

      {/* One column from `lg`; on a phone its two parts take their own places. */}
      <div className="contents lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
        {event.imageUrl ? (
          // Decorative: the title says what the event is.
          <EventPhoto
            src={event.imageUrl}
            alt=""
            rounding="xl"
            className="h-48 max-lg:order-first md:h-72 lg:aspect-video lg:h-auto"
          />
        ) : null}
        <aside
          aria-labelledby="roster-heading"
          className="flex h-fit flex-col gap-4 rounded-xl bg-signal p-4 text-signal-foreground"
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
            min={event.minParticipants}
            capacity={event.maxParticipants}
          />
          <p className="typo-small text-signal-soft">
            {t("events.detail.seats", { taken: event.takenCount, total: event.maxParticipants })}
          </p>
          {ownRequest ??
            (isHidden ? (
              <p className="typo-small text-signal-soft">{t("events.detail.hidden.seats")}</p>
            ) : state === "open" ? (
              <YourSeat
                surface="dark"
                description={t(
                  event.approvalMode === "MANUAL"
                    ? "events.detail.approvalManual"
                    : "events.detail.approvalAutomatic",
                )}
                action={joinAction}
              />
            ) : null)}
          {isHidden ? null : freeSpotWatch}
          {/* Who runs it, with the organizer's own tools next to the way to the
            requests above: everything about the people in one place (#224). */}
          <div className="flex flex-col gap-3 border-t border-signal-soft/30 pt-4">
            <p className="typo-small text-signal-soft">
              <Trans
                t={t}
                i18nKey="events.detail.organizer"
                values={{ name: event.organizerName }}
                components={{
                  profile: isOrganizerLinked ? (
                    <Link
                      to="/profile/$userId"
                      params={{ userId: event.organizerId }}
                      className="text-signal-foreground underline underline-offset-4"
                    />
                  ) : (
                    <span className="text-signal-foreground" />
                  ),
                }}
              />
            </p>
            {event.group ? (
              <p className="typo-small text-signal-soft">
                {t("events.detail.organizedByGroup")}{" "}
                <Link
                  to="/groups/$groupId"
                  params={{ groupId: event.group.id }}
                  className="font-medium text-signal-foreground underline underline-offset-4"
                >
                  {event.group.name}
                </Link>
              </p>
            ) : null}
            {organizerActions}
          </div>
        </aside>
      </div>

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

        {participantInfo ?? (
          <>
            {publicPlace}
            {!isHidden && (state === "open" || state === "full") ? (
              <p className="typo-small text-muted-foreground">
                {t(
                  event.isAddressPublic
                    ? "events.detail.hiddenContacts"
                    : "events.detail.hiddenInfo",
                )}
              </p>
            ) : null}
          </>
        )}

        {/* #236: from three revealed ratings on; before that nothing at all,
          since an upcoming event has none to show. */}
        {event.rating.average === null ? null : (
          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <h2 className="typo-h3 text-foreground">{t("events.detail.rating.title")}</h2>
            <RatingScore
              average={event.rating.average}
              count={event.rating.count}
            />
          </section>
        )}

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="typo-h3 text-foreground">{t("events.detail.stats.title")}</h2>
          {stats ? (
            <>
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                {statFigures.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col-reverse"
                  >
                    <dt className="typo-small text-muted-foreground">{label}</dt>
                    <dd className="typo-numeral text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              {stats.included < stats.total ? (
                <p className="typo-small text-muted-foreground">
                  {t("events.detail.stats.coverage", {
                    included: stats.included,
                    total: stats.total,
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="typo-small text-muted-foreground">
              {t("events.detail.stats.hidden", { count: event.statsMinParticipants })}
            </p>
          )}
        </section>

        {reportAction ? <div className="border-t border-border pt-4">{reportAction}</div> : null}
      </div>
    </div>
  )
}
