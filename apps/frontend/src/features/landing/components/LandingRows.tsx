import { useId, type CSSProperties, type ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { ArrowRight, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CountdownCard } from "@/components/hobbyhub/CountdownCard"
import { thisWeekendRange, todayRange } from "@/components/hobbyhub/filterDateRanges"
import { RADIUS_OPTIONS_KM } from "@/components/hobbyhub/FiltersSheet"
import { GroupRow } from "@/components/hobbyhub/GroupRow"
import { Loader } from "@/components/hobbyhub/Loader"
import { OrganizerCard } from "@/components/hobbyhub/OrganizerCard"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { TicketCard } from "@/components/hobbyhub/TicketCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import type {
  Landing,
  LandingActivity,
  LandingEvent,
  LandingGroup,
  LandingRow,
  LandingRowKind,
} from "@/features/landing/api/landingSchemas"
import { HowItWorks } from "@/features/landing/components/HowItWorks"
import { landingDay, landingPlace, landingTime } from "@/features/landing/lib/landingLabels"

type ActivityLabel = (activity: LandingActivity) => string

type LandingRowsProps = {
  landing: Landing | undefined
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  /** A visitor gets the invitation to groups after "Trendy skupiny". */
  isSignedIn: boolean
  /** The visitor's pick of a city for "Ve tvém okolí". */
  onCityChange: (city: string) => void
  activityLabel: ActivityLabel
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

type SeeAll = { label: string; link: LinkProps } | null

/** The nearest radius the event list offers that still covers the travel radius. */
const radiusOption = (radiusKm: number | null) =>
  RADIUS_OPTIONS_KM.find((option) => radiusKm !== null && option >= radiusKm)

/** Where "Zobrazit vše" of a row leads, if anywhere (#215 scenario 13). */
function seeAllOf(kind: LandingRowKind, landing: Landing, now: Date): LinkProps | null {
  switch (kind) {
    case "lastMinute":
      return { to: ROUTES.events, search: { soon: true } }
    case "today": {
      const { dateFrom, dateTo } = todayRange(now)
      return { to: ROUTES.events, search: { from: dateFrom, to: dateTo } }
    }
    case "weekend": {
      const { dateFrom, dateTo } = thisWeekendRange(now)
      return { to: ROUTES.events, search: { from: dateFrom, to: dateTo } }
    }
    case "liked":
      return landing.interestActivityIds.length > 0
        ? { to: ROUTES.events, search: { activity: landing.interestActivityIds } }
        : null
    case "near": {
      const near = landing.near
      if (!near) return null
      return near.mode === "radius" && near.latitude !== null && near.longitude !== null
        ? {
            to: ROUTES.events,
            search: {
              place: near.city,
              placeLat: near.latitude,
              placeLng: near.longitude,
              radius: radiusOption(near.radiusKm),
            },
          }
        : { to: ROUTES.events, search: { location: near.city } }
    }
    case "groupsForYou":
    case "trendingGroups":
      return { to: ROUTES.groups }
    // "Top akce" has no list of its own; "Kam se chystají tvoji přátelé" gets one with
    // the friends' page.
    case "top":
    case "friends":
      return null
  }
}

/** The visitor's choice of a city, under the title of "Ve tvém okolí". */
function CityPicker({
  city,
  cities,
  onChange,
}: {
  city: string
  cities: Landing["cities"]
  onChange: (city: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const options = cities.some((option) => option.city === city)
    ? cities
    : [{ city, eventCount: 0 }, ...cities]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label
        htmlFor={id}
        className="typo-small text-muted-foreground"
      >
        {t("landing.rows.near.cityLabel")}
      </Label>
      <Select
        value={city}
        onValueChange={onChange}
      >
        <SelectTrigger
          id={id}
          className="w-auto min-w-36"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.city}
              value={option.city}
            >
              {option.eventCount > 0
                ? t("landing.rows.near.cityOption", { city: option.city, count: option.eventCount })
                : option.city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** A failed load: what happened and a way to try again (DESIGN.md: every list has an error state). */
function LoadError({
  title,
  message,
  onRetry,
}: {
  title: string
  message?: string
  onRetry: () => void
}) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          {t("events.list.reload")}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** A row's heading, its line under it, its cards and "Zobrazit vše". */
function RowSection({
  title,
  subtitle,
  seeAll,
  index,
  children,
}: {
  title: string
  subtitle: ReactNode
  seeAll: SeeAll
  index: number
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex reveal flex-col gap-4"
      style={{ "--reveal-index": Math.min(index, 2) } as CSSProperties}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2
            id={headingId}
            className="typo-h2"
          >
            {title}
          </h2>
          {typeof subtitle === "string" ? (
            <p className="typo-small text-muted-foreground">{subtitle}</p>
          ) : (
            subtitle
          )}
        </div>
        {seeAll ? (
          <Button
            asChild
            variant="link"
            className="group shrink-0 max-md:hidden"
          >
            <Link {...seeAll.link}>
              {seeAll.label}
              <ArrowRight
                aria-hidden
                className="transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </Button>
        ) : null}
      </div>
      {children}
      {seeAll ? (
        <Button
          asChild
          variant="outline"
          className="md:hidden"
        >
          <Link {...seeAll.link}>{seeAll.label}</Link>
        </Button>
      ) : null}
    </section>
  )
}

/**
 * The events of a row. A phone swipes through them in one strip with the next
 * card peeking in (the landing rows are DESIGN.md's carousel exception); from
 * `md` a grid, four across on a large screen.
 */
function EventStrip({
  events,
  card,
}: {
  events: LandingEvent[]
  card: (event: LandingEvent) => ReactNode
}) {
  return (
    <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 xl:grid-cols-4 2xl:grid-cols-5">
      {events.map((event, index) => (
        <li
          key={event.id}
          // Five fill a row only on a large screen; two or four columns show four.
          className={cn(
            "w-[85%] shrink-0 snap-start md:w-auto md:shrink",
            index >= 4 && "md:max-2xl:hidden",
          )}
        >
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="group block h-full rounded-xl transition-transform duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-safe:hover:-translate-y-0.5"
          >
            {card(event)}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** The groups of a row, as the group list shows them: rows, three across on a large screen. */
function GroupStrip({
  groups,
  activityLabel,
}: {
  groups: LandingGroup[]
  activityLabel: ActivityLabel
}) {
  const { t } = useTranslation()
  return (
    <ul className="grid md:grid-cols-2 md:gap-x-8 xl:grid-cols-3">
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            to="/groups/$groupId"
            params={{ groupId: group.id }}
            className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <GroupRow
              title={group.name}
              subtitle={[
                group.locationName,
                activityLabel(group.activity),
                t("groups.detail.members", { count: group.memberCount }),
              ]
                .filter(Boolean)
                .join(" · ")}
              activity={group.activity.icon}
              schedule={group.usualSchedule}
              badge={
                group.recentMemberCount
                  ? t("landing.rows.trendingGroups.recent", { count: group.recentMemberCount })
                  : undefined
              }
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** The landing page's invitation to groups, for a visitor (DESIGN.md's dashed accent surface). */
export function GroupsInvitation() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="groups-heading"
      className="flex reveal flex-col gap-3"
    >
      <h2
        id="groups-heading"
        className="typo-h3"
      >
        {t("landing.groups.title")}
      </h2>
      <div className="flex flex-col gap-6 rounded-xl border border-dashed border-primary bg-accent p-5 text-accent-foreground md:flex-row md:items-center md:justify-center md:gap-12 md:px-12 md:py-10">
        <div
          aria-hidden
          className="shrink-0"
        >
          <RosterSeats
            size="lg"
            isInviting
            taken={4}
            capacity={5}
          />
        </div>
        <div className="flex flex-col gap-3">
          <p className="typo-title">{t("landing.groups.seatTitle")}</p>
          <p className="max-w-xl typo-body">{t("landing.groups.text")}</p>
          <div className="pt-2 *:max-md:w-full">
            <Button asChild>
              <Link to={ROUTES.groups}>{t("landing.groups.browse")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * The pre-filtered rows of the landing page (#215) in the order the server
 * sends them, with "Jak to funguje" after "Top akce" and, for a visitor, the
 * invitation to groups after "Trendy skupiny". A row with nothing in it is
 * not sent; one that failed says so and offers to try again.
 */
export function LandingRows({
  landing,
  isLoading,
  error,
  onRetry,
  isSignedIn,
  onCityChange,
  activityLabel,
  now = new Date(),
}: LandingRowsProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("landing.rows.loading")}
        />
      </div>
    )
  }

  if (!landing) {
    return (
      <>
        {error ? (
          <LoadError
            title={t("landing.rows.loadError")}
            message={error.message}
            onRetry={onRetry}
          />
        ) : null}
        <HowItWorks />
      </>
    )
  }

  const friendsOf = (event: LandingEvent) =>
    event.friends.map((friend) => ({ name: friend.name, photo: friend.image }))
  const common = (event: LandingEvent) => ({
    title: event.title,
    activity: event.activity.icon,
    taken: event.takenCount,
    min: event.minParticipants,
    max: event.maxParticipants,
    friends: friendsOf(event),
    viewerState: event.viewerState,
  })
  const day = (event: LandingEvent) => landingDay(t, event.startAt, now, locale)

  const renderCard = (kind: LandingRowKind, event: LandingEvent): ReactNode => {
    if (kind === "lastMinute") {
      return (
        <CountdownCard
          {...common(event)}
          className="transition-colors duration-200 group-hover:border-primary"
          startAt={event.startAt}
          now={now}
          activityLabel={activityLabel(event.activity)}
          place={landingPlace(t, event)}
        />
      )
    }
    if (kind === "top") {
      return (
        <OrganizerCard
          {...common(event)}
          className="transition-colors duration-200 group-hover:border-primary"
          when={`${day(event)} · ${landingTime(event.startAt, locale)}`}
          organizerName={event.organizerName}
          organizerScore={event.organizerScore}
          // The title next to it says what the photo shows.
          photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
        />
      )
    }
    return (
      <TicketCard
        {...common(event)}
        day={day(event)}
        time={landingTime(event.startAt, locale)}
        place={landingPlace(t, event)}
      />
    )
  }

  const subtitleOf = (row: LandingRow): ReactNode => {
    if (row.kind === "near" && landing.near) {
      if (landing.near.mode === "radius") {
        return t("landing.rows.near.radius", { radiusKm: landing.near.radiusKm })
      }
      return landing.cities.length > 0 ? (
        <CityPicker
          city={landing.near.city}
          cities={landing.cities}
          onChange={onCityChange}
        />
      ) : (
        t("landing.rows.near.city", { city: landing.near.city })
      )
    }
    if (row.kind === "weekend") {
      const { dateFrom, dateTo } = thisWeekendRange(now)
      const [from, to] = [dateFrom, dateTo].map((iso) => new Date(`${iso}T12:00:00`))
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).formatRange(from!, to!)
    }
    return t(`landing.rows.${row.kind}.text`)
  }

  const sections: ReactNode[] = []
  let hasHow = false
  let hasInvitation = isSignedIn
  landing.rows.forEach((row, index) => {
    const link = seeAllOf(row.kind, landing, now)
    sections.push(
      <RowSection
        key={row.kind}
        index={index}
        title={t(`landing.rows.${row.kind}.title`)}
        subtitle={subtitleOf(row)}
        seeAll={link ? { label: t(`landing.rows.${row.kind}.all`), link } : null}
      >
        {row.status === "error" ? (
          <LoadError
            title={t("landing.rows.rowError")}
            onRetry={onRetry}
          />
        ) : row.groups.length > 0 ? (
          <GroupStrip
            groups={row.groups}
            activityLabel={activityLabel}
          />
        ) : (
          <EventStrip
            events={row.events}
            card={(event) => renderCard(row.kind, event)}
          />
        )}
      </RowSection>,
    )
    // "Jak to funguje" after "Top akce", or after the first row without it.
    if (
      !hasHow &&
      (row.kind === "top" || (index === 0 && !landing.rows.some((other) => other.kind === "top")))
    ) {
      sections.push(<HowItWorks key="how" />)
      hasHow = true
    }
    if (!hasInvitation && row.kind === "trendingGroups") {
      sections.push(<GroupsInvitation key="invitation" />)
      hasInvitation = true
    }
  })

  if (landing.rows.length === 0) {
    sections.push(
      <p
        key="empty"
        className="typo-body text-muted-foreground"
      >
        {t("landing.rows.empty")}
      </p>,
    )
  }
  if (!hasHow) sections.push(<HowItWorks key="how" />)
  if (!hasInvitation) sections.push(<GroupsInvitation key="invitation" />)

  return <div className="flex flex-col gap-12 md:gap-16">{sections}</div>
}
