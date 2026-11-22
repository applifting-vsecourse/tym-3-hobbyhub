import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { Badge } from "@/components/ui/badge"

import { receivedFriendRequestCountQueryOptions } from "@/features/friendship/api/friendshipQueryOptions"
import {
  DEFAULT_FRIENDS_TAB,
  FRIENDS_TABS,
  type FriendsTab,
} from "@/features/friendship/lib/friendsSearch"

/**
 * "Vyhledat uživatele" / "Přátelé" / "Žádosti", in the order of `FRIENDS_TABS`:
 * the tab lives in the URL, the default one without a param. "Žádosti"
 * carries how many requests wait (#228).
 */
export function FriendsTabs({ active }: { active: FriendsTab }) {
  const { t } = useTranslation()
  // Just the number, on every tab; the list loads only on its own tab.
  const waiting = useQuery(receivedFriendRequestCountQueryOptions()).data ?? 0

  return (
    <PageTabs label={t("friends.tabs.label")}>
      {FRIENDS_TABS.map((tab) => (
        <PageTab
          key={tab}
          to={ROUTES.friends}
          search={tab === DEFAULT_FRIENDS_TAB ? {} : { tab }}
          isActive={active === tab}
        >
          {t(`friends.tabs.${tab}`)}
          {tab === "requests" && waiting > 0 ? (
            <Badge className="min-w-5 justify-center px-1.5">
              <span aria-hidden>{waiting}</span>
              <span className="sr-only">{t("friends.requests.waiting", { count: waiting })}</span>
            </Badge>
          ) : null}
        </PageTab>
      ))}
    </PageTabs>
  )
}
