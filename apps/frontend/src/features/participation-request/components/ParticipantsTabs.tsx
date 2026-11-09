import { useTranslation } from "react-i18next"

import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"

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
    <PageTabs label={t("participationRequests.manage.tabsLabel")}>
      {PARTICIPANTS_TABS.map((tab) => {
        const count = counts[tab]
        return (
          <PageTab
            key={tab}
            to="/events/$eventId/participants"
            params={{ eventId }}
            search={{ tab }}
            isActive={tab === active}
          >
            {count === undefined
              ? t(`participationRequests.manage.tabs.${tab}`)
              : t(`participationRequests.manage.tabs.${tab}Count`, { count })}
          </PageTab>
        )
      })}
    </PageTabs>
  )
}
