import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

import type { FriendsTab } from "@/features/friendship/lib/friendsSearch"

/** "Vyhledat uživatele" / "Přátelé" / "Žádosti": the tab lives in the URL, "search" without a param. */
export function FriendsTabs({ active }: { active: FriendsTab }) {
  const { t } = useTranslation()

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
      </PageTab>
    </PageTabs>
  )
}
