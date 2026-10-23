import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"

import type { Group, GroupRole } from "@/features/group/api/groupSchemas"

export type ActivityLabel = (activity: Group["activity"]) => string

type GroupCardProps = {
  group: Group
  /** Activities are another feature's; the route says how to name them. */
  activityLabel: ActivityLabel
  /** The viewer's role; groups they are not in show their visibility instead. */
  myRole?: GroupRole
}

/**
 * Karta skupiny — a thumbnail beside the text on phones, above it from `md`.
 * Groups have no photos yet, so the thumbnail is the activity icon on accent.
 */
export function GroupCard({ group, activityLabel, myRole }: GroupCardProps) {
  const { t } = useTranslation()
  const meta = [
    group.locationName,
    activityLabel(group.activity),
    t("groups.detail.members", { count: group.memberCount }),
  ].filter(Boolean)

  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: group.id }}
      className="flex h-full items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:flex-col md:items-stretch"
    >
      <div
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground md:h-24 md:w-full"
      >
        {isActivityKey(group.activity.icon) ? (
          <ActivityIcon
            activity={group.activity.icon}
            className="size-8"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate typo-title text-foreground">{group.name}</h3>
        <p className="typo-small text-muted-foreground">{meta.join(" · ")}</p>
        <p className="typo-small text-primary">
          {myRole
            ? t(`groups.list.role.${myRole}`)
            : t(`groups.list.visibility.${group.visibility}`)}
        </p>
      </div>
    </Link>
  )
}
