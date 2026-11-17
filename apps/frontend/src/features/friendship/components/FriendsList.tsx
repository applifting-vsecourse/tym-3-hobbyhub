import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import { friendsListQueryOptions } from "@/features/friendship/api/friendshipQueryOptions"
import {
  DEFAULT_FRIEND_LIST_SORT,
  FRIEND_LIST_SORTS,
  type FriendListSort,
} from "@/features/friendship/api/friendshipSchemas"
import { PersonCard } from "@/features/friendship/components/PersonCard"
import { RemoveFriend } from "@/features/friendship/components/RemoveFriend"

/**
 * Přátelé (#226): my friends, 20 at a time, the newest friendship first or as
 * chosen. The order lives in the address, so going back from a profile keeps
 * it. Each friend a card leading to the profile, with "Odebrat z přátel".
 */
export function FriendsList({ sort }: { sort: FriendListSort }) {
  const { t, i18n } = useTranslation()
  const query = useInfiniteQuery({
    ...friendsListQueryOptions(sort),
    // The friends stay while another order loads, instead of a flash.
    placeholderData: keepPreviousData,
  })
  const friends = query.data?.pages.flatMap((page) => page.items)
  const since = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" })

  if (query.isPending) {
    return (
      <div className="flex justify-center py-4">
        <Loader
          variant="ball"
          label={t("friends.list.loading")}
        />
      </div>
    )
  }
  // A failed next page keeps the loaded ones; the button below retries it.
  if (query.isError && !friends) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{t("friends.list.error")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            {t("friends.list.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (!friends || friends.length === 0) {
    return (
      <>
        <p className="typo-body text-muted-foreground">{t("friends.empty.friends")}</p>
        <Button
          asChild
          variant="link"
          className="w-fit px-0"
        >
          <Link
            to={ROUTES.friends}
            search={{ tab: "search" }}
          >
            {t("friends.empty.findPeople")}
          </Link>
        </Button>
      </>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <h2 className="typo-h3 text-foreground">{t("friends.list.title")}</h2>
      <nav
        aria-label={t("friends.list.sortLabel")}
        className="flex flex-wrap gap-2"
      >
        {FRIEND_LIST_SORTS.map((each) => {
          const isActive = each === sort
          return (
            <Link
              key={each}
              from={ROUTES.friends}
              to={ROUTES.friends}
              search={(previous) => ({
                ...previous,
                sort: each === DEFAULT_FRIEND_LIST_SORT ? undefined : each,
              })}
              // The list changes order, the page does not move.
              resetScroll={false}
              replace
              aria-current={isActive ? "true" : undefined}
              data-state={isActive ? "on" : "off"}
              className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
            >
              {t(`friends.list.sort.${each}`)}
            </Link>
          )
        })}
      </nav>
      <ul
        aria-label={t("friends.list.label")}
        className="flex flex-col gap-3"
      >
        {friends.map((friend) => (
          <li key={friend.id}>
            <PersonCard
              person={friend}
              detail={t("friends.list.since", { date: since.format(friend.friendsSince) })}
              action={
                <RemoveFriend
                  friendId={friend.id}
                  friendName={friend.name}
                  variant="icon"
                />
              }
            />
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <div className="flex flex-col items-center gap-2">
          {query.isFetchNextPageError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("friends.list.loadMoreError")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? t("friends.list.loadingMore") : t("friends.list.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
