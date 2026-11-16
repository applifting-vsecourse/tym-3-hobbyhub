import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Group } from "@/features/group/api/groupSchemas"
import type { ActivityLabel } from "@/features/group/components/GroupCard"

type GroupSummaryProps = {
  group: Group
  activityLabel: ActivityLabel
  className?: string
}

/**
 * The group at a glance beside its members on a large screen (#224): what it
 * plays, where and when, and the way back to its page. Everything here is
 * public (visibility matrix), the members already know it.
 */
export function GroupSummary({ group, activityLabel, className }: GroupSummaryProps) {
  const { t } = useTranslation()
  const facts = [
    group.locationName,
    group.usualSchedule,
    t("groups.detail.members", { count: group.memberCount }),
  ].filter(Boolean)

  return (
    <aside
      aria-label={t("groups.manage.summary")}
      className={cn("flex flex-col gap-3 rounded-lg border border-border p-4", className)}
    >
      <p className="flex items-center gap-2 typo-label text-muted-foreground">
        {isActivityKey(group.activity.icon) ? (
          <ActivityIcon
            activity={group.activity.icon}
            className="size-5"
          />
        ) : null}
        {activityLabel(group.activity)}
      </p>
      <ul className="flex flex-col gap-1 typo-body text-foreground">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {group.description ? (
        <p className="line-clamp-4 typo-small break-words whitespace-pre-line text-muted-foreground">
          {group.description}
        </p>
      ) : null}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="self-start"
      >
        <Link
          to="/groups/$groupId"
          params={{ groupId: group.id }}
        >
          {t("groups.manage.openGroup")}
        </Link>
      </Button>
    </aside>
  )
}
