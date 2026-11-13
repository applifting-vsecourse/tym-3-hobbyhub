import { useTranslation } from "react-i18next"

import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

export type GroupTab = "mine" | "discover" | "requests"

/** "Objevit" / "Moje skupiny" / "Žádosti", like the tabs of the event pages: the tab lives in the URL, "discover" (always first) without a param. */
export function GroupTabs({ active }: { active: GroupTab }) {
  const { t } = useTranslation()

  return (
    <PageTabs label={t("groups.list.tabsLabel")}>
      <PageTab
        to="/groups"
        search={{}}
        isActive={active === "discover"}
      >
        {t("groups.list.tabs.discover")}
      </PageTab>
      <PageTab
        to="/groups"
        search={{ tab: "mine" }}
        isActive={active === "mine"}
      >
        {t("groups.list.tabs.mine")}
      </PageTab>
      <PageTab
        to="/groups"
        search={{ tab: "requests" }}
        isActive={active === "requests"}
      >
        {t("groups.list.tabs.requests")}
      </PageTab>
    </PageTabs>
  )
}
