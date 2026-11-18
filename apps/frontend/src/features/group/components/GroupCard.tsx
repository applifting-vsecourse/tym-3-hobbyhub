import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { GroupRow } from "@/components/hobbyhub/GroupRow"

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
 * A group in a listing: a `GroupRow`, like an event's `ScheduleRow`, as a link
 * to the group. Groups have no photos yet, so the row shows the activity icon.
 */
export function GroupCard({ group, activityLabel, myRole }: GroupCardProps) {
  const { t, i18n } = useTranslation()
  const next = group.nextEvent
  const nextLabel = next
    ? t("groups.nextEvent.label", {
        when: new Intl.DateTimeFormat(i18n.language, {
          weekday: "short",
          day: "numeric",
          month: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(next.startAt),
      })
    : null
  const meta = [
    group.locationName,
    activityLabel(group.activity),
    t("groups.detail.members", { count: group.memberCount }),
  ].filter(Boolean)

  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: group.id }}
      className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <GroupRow
        title={group.name}
        subtitle={meta.join(" · ")}
        activity={group.activity.icon}
        schedule={group.usualSchedule}
        description={group.description}
        activeLabel={group.isActive ? t("groups.active") : undefined}
        approval={t(`groups.approval.${group.approvalMode}`)}
        nextEvent={
          next ? (
            <>
              {nextLabel} ·{" "}
              {next.hasFreeSeats ? t("groups.nextEvent.freeSeats") : t("groups.nextEvent.full")}
            </>
          ) : undefined
        }
        badge={myRole ? t(`groups.list.role.${myRole}`) : undefined}
      />
    </Link>
  )
}
