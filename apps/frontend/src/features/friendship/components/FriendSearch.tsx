import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Loader } from "@/components/hobbyhub/Loader"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { friendSearchQueryOptions } from "@/features/friendship/api/friendshipQueryOptions"
import { sendFriendRequestErrorKey } from "@/features/friendship/api/friendshipRequests"
import {
  FRIEND_SEARCH_MAX_LENGTH,
  FRIEND_SEARCH_MIN_LENGTH,
  type FriendSearchItem,
} from "@/features/friendship/api/friendshipSchemas"
import { FriendRelationBadge } from "@/features/friendship/components/FriendRelationBadge"
import { PersonCard } from "@/features/friendship/components/PersonCard"
import { RemoveFriend } from "@/features/friendship/components/RemoveFriend"
import { useSendFriendRequest } from "@/features/friendship/hooks/useSendFriendRequest"

type FriendSearchProps = {
  /** The text in the address (`?q=`): what is searched. */
  text: string
  /** What is in the field; it reaches `text` after a pause in typing. */
  typed: string
  onTypedChange: (typed: string) => void
}

/**
 * Vyhledat uživatele (#225): people by part of their nickname, never
 * by e-mail. Each one a card leading to the profile, with my relation to them.
 */
export function FriendSearch({ text, typed, onTypedChange }: FriendSearchProps) {
  const { t } = useTranslation()
  const isLongEnough = text.length >= FRIEND_SEARCH_MIN_LENGTH
  const search = useInfiniteQuery({
    ...friendSearchQueryOptions(text),
    // The previous results stay while the next text loads, instead of a flash.
    placeholderData: keepPreviousData,
  })
  const people = isLongEnough ? search.data?.pages.flatMap((page) => page.items) : undefined
  const isCapped = search.data?.pages.at(-1)?.isCapped ?? false

  return (
    <div className="flex flex-col gap-6">
      <SearchField
        label={t("friends.search.label")}
        placeholder={t("friends.search.placeholder")}
        maxLength={FRIEND_SEARCH_MAX_LENGTH}
        value={typed}
        onChange={(event) => onTypedChange(event.target.value)}
      />
      {!isLongEnough ? (
        <p className="typo-body text-muted-foreground">
          {t("friends.search.hint", { count: FRIEND_SEARCH_MIN_LENGTH })}
        </p>
      ) : search.isPending ? (
        <div className="flex justify-center py-4">
          <Loader
            variant="ball"
            label={t("friends.search.loading")}
          />
        </div>
      ) : // A failed next page keeps the loaded ones; the button below retries it.
      search.isError && !people ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{t("friends.search.error")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={() => void search.refetch()}
            >
              <RefreshCw className="size-4" />
              {t("friends.search.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : people?.length === 0 ? (
        <p className="typo-body text-muted-foreground">{t("friends.search.noResults")}</p>
      ) : people ? (
        <>
          <ul
            aria-label={t("friends.search.results")}
            className="flex flex-col gap-3"
          >
            {people.map((person) => (
              <li key={person.id}>
                <FriendSearchCard person={person} />
              </li>
            ))}
          </ul>
          {search.hasNextPage ? (
            <div className="flex flex-col items-center gap-2">
              {search.isFetchNextPageError ? (
                <p
                  role="alert"
                  className="typo-small text-destructive"
                >
                  {t("friends.search.loadMoreError")}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={search.isFetchingNextPage}
                onClick={() => void search.fetchNextPage()}
              >
                {search.isFetchingNextPage
                  ? t("friends.search.loadingMore")
                  : t("friends.search.loadMore")}
              </Button>
            </div>
          ) : null}
          {/* Review of #225: the pages stop at 100 people, so nobody lists everyone. */}
          {isCapped ? (
            <p className="typo-body text-muted-foreground">{t("friends.search.capped")}</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/**
 * One person found: the card leads to their profile. A friend can be removed
 * right here (#226).
 */
function FriendSearchCard({ person }: { person: FriendSearchItem }) {
  return (
    <PersonCard
      person={person}
      aside={<FriendRelationBadge relation={person.relation} />}
      action={
        person.relation === "friends" ? (
          <RemoveFriend
            friendId={person.id}
            friendName={person.name}
            variant="icon"
          />
        ) : person.relation === "none" ? (
          <SendFriendRequestIcon person={person} />
        ) : undefined
      }
    />
  )
}

/**
 * #226: asks for friendship right from the search, without opening the
 * profile. The search reloads after it, so the card shows the new relation.
 */
function SendFriendRequestIcon({ person }: { person: FriendSearchItem }) {
  const { t } = useTranslation()
  const send = useSendFriendRequest(person.id, () => Promise.resolve())

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="relative size-11 shrink-0 md:size-9"
      aria-label={t("friends.action.sendShortLabel", { name: person.name })}
      title={t("friends.action.send")}
      disabled={send.isPending}
      onClick={() =>
        send.mutate(undefined, {
          onError: (error) => toast.error(t(sendFriendRequestErrorKey(error))),
        })
      }
    >
      {send.isPending ? (
        <Loader2
          aria-hidden
          className="animate-spin"
        />
      ) : (
        <UserPlus aria-hidden />
      )}
    </Button>
  )
}
