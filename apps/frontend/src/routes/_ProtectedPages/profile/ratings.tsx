import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import {
  givenRatingsQueryOptions,
  receivedRatingsQueryOptions,
} from "@/features/rating/api/ratingQueryOptions"
import type { RatingDirection } from "@/features/rating/api/ratingSchemas"
import {
  GivenRatings,
  MyRatingsTabs,
  ReceivedRatings,
  type MyRatingsTab,
  type RatingsList,
} from "@/features/rating/components/MyRatings"

// "Jako organizátor" is the default and has no param; anything unknown falls
// back to it.
const myRatingsSearchSchema = z.object({
  tab: z.enum(["participant", "given"]).optional().catch(undefined),
})

// #234: "Moje hodnocení", reached from one's own profile. Only ever the
// signed-in person's own ratings (visibility matrix).
export const Route = createFileRoute("/_ProtectedPages/profile/ratings")({
  component: MyRatingsPage,
  validateSearch: myRatingsSearchSchema,
})

/** A part's view of its infinite query: all loaded rows and what the buttons need. */
function toList<T>(
  query: UseInfiniteQueryResult<{ pages: { items: T[] }[] }, Error>,
): RatingsList<T> {
  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    isLoading: query.isPending,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
    // A failed first load is asked for again; a failed next page only that page.
    onRetry: () => void (query.data ? query.fetchNextPage() : query.refetch()),
  }
}

function ReceivedTab({ userId, direction }: { userId: string; direction: RatingDirection }) {
  const query = useInfiniteQuery(receivedRatingsQueryOptions(userId, direction))
  // The score and how the stars fell cover all ratings, so any page has them.
  const first = query.data?.pages[0]

  return (
    <ReceivedRatings
      ratedAs={direction === "TO_ORGANIZER" ? "asOrganizer" : "asParticipant"}
      list={toList(query)}
      summary={first ? { score: first.score, distribution: first.distribution } : null}
    />
  )
}

function GivenTab({ userId }: { userId: string }) {
  return <GivenRatings list={toList(useInfiniteQuery(givenRatingsQueryOptions(userId)))} />
}

function MyRatingsPage() {
  const { t } = useTranslation()
  const { user } = useSession()
  const search = Route.useSearch()
  const tab: MyRatingsTab = search.tab ?? "organizer"

  return (
    <>
      <Seo title={t("rating.mine.title")} />
      {/* More room under the page on a phone: "Načíst další" ends the list, and
          the raised "Přidat akci" of the BottomNav would sit on it. */}
      <section className="mx-auto flex w-full max-w-column-2xl flex-col gap-6 px-page pt-6 pb-16 md:py-12">
        <div className="flex flex-col">
          <BackLink
            to={ROUTES.profile}
            label={t("rating.mine.back")}
          />
          <h1 className="typo-h1 text-foreground">{t("rating.mine.title")}</h1>
        </div>
        <MyRatingsTabs active={tab} />
        {user === null ? null : tab === "given" ? (
          <GivenTab userId={user.id} />
        ) : (
          // Keyed, so switching roles starts from that role's own loading state.
          <ReceivedTab
            key={tab}
            userId={user.id}
            direction={tab === "organizer" ? "TO_ORGANIZER" : "TO_PARTICIPANT"}
          />
        )}
      </section>
    </>
  )
}
