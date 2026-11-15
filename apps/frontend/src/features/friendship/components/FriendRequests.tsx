import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { relativeTime } from "@/lib/relativeTime"

import { receivedFriendRequestsQueryOptions } from "@/features/friendship/api/friendshipQueryOptions"
import type { ReceivedFriendRequest } from "@/features/friendship/api/friendshipSchemas"
import { FriendRequestDecision } from "@/features/friendship/components/FriendRequestDecision"

type FriendRequestsProps = {
  /** Injectable so "před 5 min" is stable in tests. */
  now?: Date
}

/**
 * Žádosti (#228): the friend requests waiting for me, newest first, 20 at a
 * time. Each a card with the person, a link to their profile and the buttons;
 * a decided one leaves the list when it loads again.
 */
export function FriendRequests({ now = new Date() }: FriendRequestsProps) {
  const { t } = useTranslation()
  const query = useInfiniteQuery(receivedFriendRequestsQueryOptions())
  const requests = query.data?.pages.flatMap((page) => page.items)

  if (query.isPending) {
    return (
      <div className="flex justify-center py-4">
        <Loader
          variant="ball"
          label={t("friends.requests.loading")}
        />
      </div>
    )
  }
  // A failed next page keeps the loaded ones; the button below retries it.
  if (query.isError && !requests) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{t("friends.requests.error")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            {t("friends.requests.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (!requests || requests.length === 0) {
    return (
      <>
        <p className="typo-body text-muted-foreground">{t("friends.empty.requests")}</p>
        <Button
          asChild
          variant="link"
          className="w-fit px-0"
        >
          <Link
            to={ROUTES.friends}
            search={{}}
          >
            {t("friends.empty.findPeople")}
          </Link>
        </Button>
      </>
    )
  }
  return (
    <>
      <ul
        aria-label={t("friends.requests.list")}
        className="flex flex-col gap-3"
      >
        {requests.map((request) => (
          <li key={request.id}>
            <FriendRequestCard
              request={request}
              now={now}
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
              {t("friends.requests.loadMoreError")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? t("friends.requests.loadingMore")
              : t("friends.requests.loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  )
}

/**
 * One request: the person (a link to their profile) and when they asked, the
 * buttons under it on phones and beside it from `md`. Not one link as a whole,
 * because it holds buttons.
 */
function FriendRequestCard({ request, now }: { request: ReceivedFriendRequest; now: Date }) {
  const { t, i18n } = useTranslation()
  const { sender } = request
  const when = relativeTime(request.requestedAt, now, i18n.language, t("notifications.justNow"))

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PersonAvatar
          name={sender.name}
          photo={sender.image}
        />
        <div className="flex min-w-0 flex-col">
          <Link
            to="/profile/$userId"
            params={{ userId: sender.id }}
            className="w-fit typo-title break-words text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
          >
            {sender.name}
          </Link>
          <span className="typo-small break-words text-muted-foreground">
            {sender.nickname
              ? t("friends.requests.nicknameAndWhen", {
                  nickname: t("friends.nickname", { nickname: sender.nickname }),
                  when,
                })
              : when}
          </span>
        </div>
      </div>
      <FriendRequestDecision
        senderId={sender.id}
        senderName={sender.name}
        errorAs="toast"
      />
    </article>
  )
}
