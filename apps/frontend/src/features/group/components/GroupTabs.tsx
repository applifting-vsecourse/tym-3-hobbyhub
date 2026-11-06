import { useTranslation } from "react-i18next"

import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

export type GroupTab = "mine" | "discover"

/** "Moje skupiny" / "Objevit": the tab lives in the URL, "mine" without a param. */
export function GroupTabs({ active }: { active: GroupTab }) {
  const { t } = useTranslation()

  return (
    <PageTabs label={t("groups.list.tabsLabel")}>
      <PageTab
        to="/groups"
        search={{}}
        isActive={active === "mine"}
      >
        {t("groups.list.tabs.mine")}
      </PageTab>
      <PageTab
        to="/groups"
        search={{ tab: "discover" }}
        isActive={active === "discover"}
      >
        {t("groups.list.tabs.discover")}
      </PageTab>
    </PageTabs>
  )
}
