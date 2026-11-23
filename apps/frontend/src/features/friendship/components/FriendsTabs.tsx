import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { Badge } from "@/components/ui/badge"

import {
  friendCountQueryOptions,
  receivedFriendRequestCountQueryOptions,
} from "@/features/friendship/api/friendshipQueryOptions"
import {
  DEFAULT_FRIENDS_TAB,
  FRIENDS_TABS,
  type FriendsTab,
} from "@/features/friendship/lib/friendsSearch"

/** #226: more waiting requests than a page holds show as "20+". */
const WAITING_SHOWN_UP_TO = 20

/**
 * "Přátelé" / "Akce přátel" / "Žádosti" / "Vyhledat uživatele", in the order of
 * `FRIENDS_TABS`: the tab lives in the URL, the default one without a param.
 * "Žádosti" carries how many requests wait (#228), at most "20+" (#226);
 * "Přátelé" how many friends there are, muted (#226).
 */
export function FriendsTabs({ active }: { active: FriendsTab }) {
  const { t } = useTranslation()
  // Just the number, on every tab; the list loads only on its own tab.
  const waiting = useQuery(receivedFriendRequestCountQueryOptions()).data ?? 0
  // #226: how many friends, muted: nothing waits there, unlike the requests.
  const friends = useQuery(friendCountQueryOptions()).data ?? 0

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
          {tab === "friends" && friends > 0 ? (
            <Badge
              variant="secondary"
              className="min-w-5 justify-center px-1.5 text-muted-foreground"
            >
              <span aria-hidden>{friends}</span>
              <span className="sr-only">{t("friends.list.count", { count: friends })}</span>
            </Badge>
          ) : null}
          {tab === "requests" && waiting > 0 ? (
            <Badge className="min-w-5 justify-center px-1.5">
              <span aria-hidden>
                {waiting > WAITING_SHOWN_UP_TO ? `${WAITING_SHOWN_UP_TO}+` : waiting}
              </span>
              <span className="sr-only">{t("friends.requests.waiting", { count: waiting })}</span>
            </Badge>
          ) : null}
        </PageTab>
      ))}
    </PageTabs>
  )
}
