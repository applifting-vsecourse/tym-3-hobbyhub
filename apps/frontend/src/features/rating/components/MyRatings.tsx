import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { RatingScore, RatingStars } from "@/components/hobbyhub/RatingScore"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  RATING_MIN_COUNT_TO_SHOW,
  RATING_STARS_MAX,
  type RatingScore as Score,
} from "@/lib/ratingScore"

import type {
  GivenRating,
  ReceivedRating,
  ReceivedRatingPage,
} from "@/features/rating/api/ratingSchemas"

/** The three parts of "Moje hodnocení"; the first one has no param in the URL. */
export type MyRatingsTab = "organizer" | "participant" | "given"

/** What a part needs to know about its list, whatever loads it. */
export type RatingsList<T> = {
  items: T[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  /** Retries what failed: the first load or the next page. */
  onRetry: () => void
}

/**
 * The parts as links, because the part lives in the URL (`/profile/ratings`,
 * `?tab=participant`, `?tab=given`), so a link can open a given one.
 */
export function MyRatingsTabs({ active }: { active: MyRatingsTab }) {
  const { t } = useTranslation()

  return (
    <PageTabs label={t("rating.mine.tabs.label")}>
      <PageTab
        to="/profile/ratings"
        search={{}}
        isActive={active === "organizer"}
      >
        {t("rating.mine.tabs.asOrganizer")}
      </PageTab>
      <PageTab
        to="/profile/ratings"
        search={{ tab: "participant" }}
        isActive={active === "participant"}
      >
        {t("rating.mine.tabs.asParticipant")}
      </PageTab>
      <PageTab
        to="/profile/ratings"
        search={{ tab: "given" }}
        isActive={active === "given"}
      >
        {t("rating.mine.tabs.given")}
      </PageTab>
    </PageTabs>
  )
}

/** One list's three states and its rows with "load more". */
function ListBody<T>({
  list,
  empty,
  children,
}: {
  list: RatingsList<T>
  /** One sentence saying what would appear here. */
  empty: string
  children: (item: T) => ReactNode
}) {
  const { t } = useTranslation()

  if (list.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader
          variant="seats"
          label={t("rating.page.loading")}
        />
      </div>
    )
  }

  const loadError = list.error ? (
    <Alert variant="destructive">
      <AlertTitle>{t("rating.page.loadError")}</AlertTitle>
      <AlertDescription className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={list.onRetry}
        >
          {t("rating.page.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  ) : null

  if (list.items.length === 0) {
    return loadError ?? <p className="typo-body text-muted-foreground">{empty}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border border-t border-border">
        {list.items.map(children)}
      </ul>
      {/* A later page failed: keep what is loaded and retry just that. */}
      {loadError ??
        (list.hasMore ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={list.isLoadingMore}
            onClick={list.onLoadMore}
          >
            {t("rating.mine.loadMore")}
          </Button>
        ) : null)}
    </div>
  )
}

/** Stars with their number in words for a screen reader. */
function Stars({ stars }: { stars: number }) {
  const { t } = useTranslation()
  return (
    <span className="flex shrink-0 items-center">
      <RatingStars stars={stars} />
      <span className="sr-only">
        {t("rating.starsOf", { count: stars, max: RATING_STARS_MAX })}
      </span>
    </span>
  )
}

/** The event a rating belongs to and the day it was given. */
function EventAndDay({
  event,
  createdAt,
  prefix,
}: {
  event: { id: string; title: string }
  createdAt: Date
  /** Which way the rating went, on the sent ones. */
  prefix?: string
}) {
  const { i18n } = useTranslation()
  const day = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium" }).format(
    createdAt,
  )

  return (
    <p className="typo-small break-words text-muted-foreground">
      {prefix ? `${prefix} · ` : null}
      <Link
        to="/events/$eventId"
        params={{ eventId: event.id }}
        className="underline-offset-4 hover:underline"
      >
        {event.title}
      </Link>
      {` · ${day}`}
    </p>
  )
}

function Comment({ text }: { text: string | null }) {
  return text ? (
    <p className="max-w-prose typo-body break-words whitespace-pre-line text-foreground">{text}</p>
  ) : null
}

const STAR_ROWS = [5, 4, 3, 2, 1] as const

/** How many times each number of stars came up, as five rows with a bar. */
function Distribution({
  distribution,
  count,
}: {
  distribution: ReceivedRatingPage["distribution"]
  count: number
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      <h3 className="typo-label text-muted-foreground">{t("rating.mine.distribution")}</h3>
      <dl className="grid max-w-sm grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
        {STAR_ROWS.map((stars) => (
          <div
            key={stars}
            className="col-span-3 grid grid-cols-subgrid items-center"
          >
            <dt className="flex items-center gap-1 typo-small text-muted-foreground">
              <span aria-hidden="true">{stars}</span>
              <Star
                aria-hidden="true"
                className="size-3 fill-current"
              />
              <span className="sr-only">
                {t("rating.starsOf", { count: stars, max: RATING_STARS_MAX })}
              </span>
            </dt>
            <dd className="contents">
              <span
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-foreground"
                  style={{ width: `${(distribution[stars] / count) * 100}%` }}
                />
              </span>
              <span className="text-right typo-small text-foreground">{distribution[stars]}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

type ReceivedRatingsProps = {
  /** In which role the person was rated: it picks the words of the empty state. */
  ratedAs: "asOrganizer" | "asParticipant"
  list: RatingsList<ReceivedRating>
  /** The role's score and how the stars fell; null until the first page is here. */
  summary: { score: Score; distribution: ReceivedRatingPage["distribution"] } | null
}

/**
 * #234, ADR-0027: what others said of the person in one role, once the rating
 * period of each event is over: the score, how the stars fell, and every
 * rating with its author. Ratings still waiting are not here, nor is any sign
 * that they exist.
 */
export function ReceivedRatings({ ratedAs, list, summary }: ReceivedRatingsProps) {
  const { t } = useTranslation()
  const count = summary?.score.count ?? 0

  return (
    <div className="flex flex-col gap-6">
      {summary && count > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <RatingScore
              average={summary.score.average}
              count={summary.score.count}
            />
            {count < RATING_MIN_COUNT_TO_SHOW ? (
              <p className="typo-caption text-muted-foreground">
                {t("profile.ratings.ownBelowMinimum", { count, min: RATING_MIN_COUNT_TO_SHOW })}
              </p>
            ) : null}
          </div>
          <Distribution
            distribution={summary.distribution}
            count={count}
          />
        </div>
      ) : null}
      <ListBody
        list={list}
        empty={t(`rating.mine.empty.${ratedAs}`)}
      >
        {(rating) => (
          <li
            key={rating.id}
            className="flex flex-col gap-2 py-4"
          >
            <div className="flex items-center gap-3">
              {rating.author ? (
                <PersonAvatar
                  name={rating.author.name}
                  size="md"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-10 shrink-0 rounded-full bg-muted"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                {rating.author ? (
                  <Link
                    to="/profile/$userId"
                    params={{ userId: rating.author.id }}
                    className="truncate typo-label-lg text-foreground underline-offset-4 hover:underline"
                  >
                    {rating.author.name}
                  </Link>
                ) : (
                  <span className="typo-label-lg text-muted-foreground">
                    {t("rating.mine.deletedAuthor")}
                  </span>
                )}
                <EventAndDay
                  event={rating.event}
                  createdAt={rating.createdAt}
                />
              </div>
              <Stars stars={rating.stars} />
            </div>
            <Comment text={rating.comment} />
          </li>
        )}
      </ListBody>
      <p className="typo-small text-muted-foreground">{t("rating.mine.receivedNote")}</p>
    </div>
  )
}

/**
 * #234: what the person rated, newest first, and whether the rated one sees
 * it yet. A sent rating is final, so the list only shows.
 */
export function GivenRatings({ list }: { list: RatingsList<GivenRating> }) {
  const { t } = useTranslation()

  return (
    <ListBody
      list={list}
      empty={t("rating.mine.empty.given")}
    >
      {(rating) => (
        <li
          key={rating.id}
          className="flex flex-col gap-2 py-4"
        >
          <div className="flex items-center gap-3">
            <PersonAvatar
              name={rating.ratedUser.name}
              size="md"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                to="/profile/$userId"
                params={{ userId: rating.ratedUser.id }}
                className="truncate typo-label-lg text-foreground underline-offset-4 hover:underline"
              >
                {rating.ratedUser.name}
              </Link>
              <EventAndDay
                event={rating.event}
                createdAt={rating.createdAt}
                prefix={t(
                  rating.direction === "TO_ORGANIZER"
                    ? "rating.mine.given.toOrganizer"
                    : "rating.mine.given.toParticipant",
                )}
              />
            </div>
            <Stars stars={rating.stars} />
          </div>
          <Comment text={rating.comment} />
          <StatusBadge
            status={rating.isRevealed ? "neutral" : "pending"}
            className="self-start"
          >
            {t(rating.isRevealed ? "rating.mine.given.revealed" : "rating.mine.given.hidden")}
          </StatusBadge>
        </li>
      )}
    </ListBody>
  )
}
