import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { Badge } from "@/components/ui/badge"

import { receivedFriendRequestsQueryOptions } from "@/features/friendship/api/friendshipQueryOptions"
import type { FriendsTab } from "@/features/friendship/lib/friendsSearch"

/**
 * "Vyhledat uživatele" / "Přátelé" / "Žádosti": the tab lives in the URL,
 * "search" without a param. "Žádosti" carries how many requests wait (#228).
 */
export function FriendsTabs({ active }: { active: FriendsTab }) {
  const { t } = useTranslation()
  // The same query as the list on the tab: its first page knows the total.
  const received = useInfiniteQuery(receivedFriendRequestsQueryOptions())
  const waiting = received.data?.pages[0]?.total ?? 0

  return (
    <PageTabs label={t("friends.tabs.label")}>
      <PageTab
        to={ROUTES.friends}
        search={{}}
        isActive={active === "search"}
      >
        {t("friends.tabs.search")}
      </PageTab>
      <PageTab
        to={ROUTES.friends}
        search={{ tab: "friends" }}
        isActive={active === "friends"}
      >
        {t("friends.tabs.friends")}
      </PageTab>
      <PageTab
        to={ROUTES.friends}
        search={{ tab: "requests" }}
        isActive={active === "requests"}
      >
        {t("friends.tabs.requests")}
        {waiting > 0 ? (
          <Badge className="min-w-5 justify-center px-1.5">
            <span aria-hidden>{waiting}</span>
            <span className="sr-only">{t("friends.requests.waiting", { count: waiting })}</span>
          </Badge>
        ) : null}
      </PageTab>
    </PageTabs>
  )
}
