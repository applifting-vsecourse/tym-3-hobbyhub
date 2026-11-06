import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export const PARTICIPANTS_TABS = ["requests", "participants"] as const
export type ParticipantsTab = (typeof PARTICIPANTS_TABS)[number]

type ParticipantsTabsProps = {
  eventId: string
  active: ParticipantsTab
  /** Undefined while a count is loading. */
  counts: Record<ParticipantsTab, number | undefined>
}

/** "Žádosti 3" / "Účastníci 7": links, because the tab lives in the URL. */
export function ParticipantsTabs({ eventId, active, counts }: ParticipantsTabsProps) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("participationRequests.manage.tabsLabel")}
      className="flex gap-2"
    >
      {PARTICIPANTS_TABS.map((tab) => {
        const isActive = tab === active
        const count = counts[tab]
        return (
          <Link
            key={tab}
            to="/events/$eventId/participants"
            params={{ eventId }}
            search={{ tab }}
            aria-current={isActive ? "page" : undefined}
            data-state={isActive ? "on" : "off"}
            className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
          >
            {count === undefined
              ? t(`participationRequests.manage.tabs.${tab}`)
              : t(`participationRequests.manage.tabs.${tab}Count`, { count })}
          </Link>
        )
      })}
    </nav>
  )
}
