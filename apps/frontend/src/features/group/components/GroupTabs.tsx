import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export type GroupTab = "mine" | "discover"

const TABS: GroupTab[] = ["mine", "discover"]

/**
 * "Moje skupiny" / "Objevit" — links, because the tab lives in the URL, drawn
 * as the kit's filter chips.
 */
export function GroupTabs({ active }: { active: GroupTab }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("groups.list.tabsLabel")}
      className="flex gap-2"
    >
      {TABS.map((tab) => {
        const isActive = tab === active
        return (
          <Link
            key={tab}
            to="/groups"
            search={tab === "mine" ? {} : { tab }}
            aria-current={isActive ? "page" : undefined}
            data-state={isActive ? "on" : "off"}
            className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
          >
            {t(`groups.list.tabs.${tab}`)}
          </Link>
        )
      })}
    </nav>
  )
}
