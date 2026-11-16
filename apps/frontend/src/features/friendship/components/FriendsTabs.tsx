import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

import {
  DEFAULT_FRIENDS_TAB,
  FRIENDS_TABS,
  type FriendsTab,
} from "@/features/friendship/lib/friendsSearch"

/**
 * "Vyhledat uživatele" / "Přátelé" / "Žádosti", in the order of `FRIENDS_TABS`:
 * the tab lives in the URL, the default one without a param.
 */
export function FriendsTabs({ active }: { active: FriendsTab }) {
  const { t } = useTranslation()

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
        </PageTab>
      ))}
    </PageTabs>
  )
}
