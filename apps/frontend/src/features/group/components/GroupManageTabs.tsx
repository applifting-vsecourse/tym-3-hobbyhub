import { useTranslation } from "react-i18next"

import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

export type GroupManageTab = "members" | "requests"

const TABS: GroupManageTab[] = ["members", "requests"]

type GroupManageTabsProps = {
  groupId: string
  active: GroupManageTab
  /** Undefined while a count is loading. */
  counts: Record<GroupManageTab, number | undefined>
}

/** "Členové 14" / "Žádosti 2": links, because the tab lives in the URL. */
export function GroupManageTabs({ groupId, active, counts }: GroupManageTabsProps) {
  const { t } = useTranslation()

  return (
    <PageTabs label={t("groups.manage.tabsLabel")}>
      {TABS.map((tab) => (
        <PageTab
          key={tab}
          to="/groups/$groupId/members"
          params={{ groupId }}
          search={tab === "members" ? {} : { tab }}
          isActive={tab === active}
        >
          {t(`groups.manage.tabs.${tab}`, { count: counts[tab] ?? 0 })}
        </PageTab>
      ))}
    </PageTabs>
  )
}
