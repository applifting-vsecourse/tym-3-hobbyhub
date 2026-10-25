import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupMembershipPanel } from "@/features/group/components/GroupMembershipPanel"
import type { GroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

type GroupDetailProps = {
  group: Group
  /** Display name of the activity; the activity feature owns the translation. */
  activityLabel: string
  membership: GroupMembershipState
  /** Encoded address of this page, for the way back from sign-in. */
  from: string
}

/**
 * Public group detail (F-02.5): what a visitor needs to decide about joining.
 * The member count is shown, never the members.
 */
export function GroupDetail({ group, activityLabel, membership, from }: GroupDetailProps) {
  const { t } = useTranslation()
  const memberCount = group.memberCount + membership.extraMembers
  const meta = [
    t("groups.detail.visibilityPublic"),
    group.locationName,
    group.usualSchedule,
    t("groups.detail.members", { count: memberCount }),
  ].filter(Boolean)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-8">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 typo-label text-muted-foreground">
          {isActivityKey(group.activity.icon) ? (
            <ActivityIcon
              activity={group.activity.icon}
              className="size-5"
            />
          ) : null}
          {activityLabel}
        </p>
        <h1 className="typo-h1 text-foreground">{group.name}</h1>
        <p className="typo-body text-muted-foreground">{meta.join(" · ")}</p>
      </header>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <GroupMembershipPanel
          membership={membership}
          groupName={group.name}
          from={from}
        />
      </div>

      <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
        <p className="max-w-prose typo-body-lg break-words whitespace-pre-line text-foreground">
          {group.description}
        </p>

        {/* TODO(F-07.5 #50): the upcoming events of the group go here. */}
        <section
          aria-labelledby="upcoming-heading"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <h2
            id="upcoming-heading"
            className="typo-h3 text-foreground"
          >
            {t("groups.detail.upcoming.title")}
          </h2>
          <p className="typo-body text-muted-foreground">
            {t("groups.detail.upcoming.inProgress")}
          </p>
        </section>
      </div>
    </div>
  )
}
