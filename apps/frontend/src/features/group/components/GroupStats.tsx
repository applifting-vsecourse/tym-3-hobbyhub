import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { Group } from "@/features/group/api/groupSchemas"
import { groupStatsQueryOptions } from "@/features/group/api/groupStatsQueryOptions"

/**
 * The numbers of a group in one strip (ADR-0028): members, when it meets, how
 * many events it played and how many people came. Hairlines between, no boxes.
 * The two that need the events load on their own; the strip never waits for them.
 */
export function GroupStats({ group }: { group: Group }) {
  const { t } = useTranslation()
  const stats = useQuery(groupStatsQueryOptions(group.id))
  const day = group.meetingDays[0]
  const items = [
    { key: "members", value: String(group.memberCount), label: t("groups.detail.stats.members") },
    // When the group meets is its own to tell: without it the cell is not there.
    ...(day
      ? [
          {
            key: "meets",
            value: t(`groups.weekdays.${day}`),
            label: t("groups.detail.stats.meets"),
          },
        ]
      : []),
    {
      key: "played",
      value: stats.data ? String(stats.data.playedEvents) : t("groups.detail.stats.none"),
      label: t("groups.detail.stats.played"),
    },
    {
      key: "average",
      value: stats.data?.playedEvents
        ? String(stats.data.averageParticipants)
        : t("groups.detail.stats.none"),
      label: t("groups.detail.stats.average"),
    },
  ]

  return (
    // One tinted band instead of four floating numbers; a phone keeps all of them in one row.
    <dl
      className={cn(
        "grid gap-x-2 rounded-lg bg-muted px-3 py-3 md:gap-x-4 md:px-4",
        items.length === 4 ? "grid-cols-4" : "grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="flex flex-col gap-0.5"
        >
          <dd className="typo-h3 text-foreground">{item.value}</dd>
          <dt className="typo-caption text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  )
}
