import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

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
    <nav
      aria-label={t("groups.manage.tabsLabel")}
      className="flex gap-2"
    >
      {TABS.map((tab) => {
        const isActive = tab === active
        return (
          <Link
            key={tab}
            to="/groups/$groupId/members"
            params={{ groupId }}
            search={tab === "members" ? {} : { tab }}
            aria-current={isActive ? "page" : undefined}
            data-state={isActive ? "on" : "off"}
            className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
          >
            {t(`groups.manage.tabs.${tab}`, { count: counts[tab] ?? 0 })}
          </Link>
        )
      })}
    </nav>
  )
}
