import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Badge } from "@/components/ui/badge"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupFacts } from "@/features/group/components/GroupFacts"
import { GroupStats } from "@/features/group/components/GroupStats"

type GroupDetailProps = {
  group: Group
  /** Display name of the activity; the activity feature owns the translation. */
  activityLabel: string
  /** The membership panel: ask to join, the pending request, or membership. */
  membershipPanel: ReactNode
  /** For the group's admins only (F-07.3): the way to the requests. */
  adminPanel?: ReactNode
  /** For the group's members only (F-07.3): the members. */
  membersPreview?: ReactNode
  /** Akce skupiny (F-07.2); the event feature owns the list. */
  events?: ReactNode
}

/**
 * Public group detail (F-02.5): what a visitor needs to decide about joining.
 * Everyone sees the member count; only the group's members see the members.
 */
export function GroupDetail({
  group,
  activityLabel,
  membershipPanel,
  adminPanel,
  membersPreview,
  events,
}: GroupDetailProps) {
  const { t } = useTranslation()
  const meta = [group.locationName, activityLabel].filter(Boolean)

  return (
    // From `xl` the page is wider (#224): the side panel gets more room, the
    // description keeps its line length.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-x-12">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="typo-h1 text-foreground">{group.name}</h1>
          {group.isActive ? <Badge variant="success">{t("groups.active")}</Badge> : null}
        </div>
        <p className="typo-body text-muted-foreground">{meta.join(" · ")}</p>
        {group.tagline ? (
          <p className="typo-body-lg break-words text-foreground">{group.tagline}</p>
        ) : null}
        <p className="typo-label text-primary">{t(`groups.approval.${group.approvalMode}`)}</p>
      </header>

      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {membershipPanel}
        <GroupFacts group={group} />
        {/* Beside the membership, not at the foot of a long page. */}
        {membersPreview}
        {adminPanel}
      </div>

      <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
        <GroupStats group={group} />
        <p className="max-w-prose typo-body-lg break-words whitespace-pre-line text-foreground">
          {group.description}
        </p>

        {events}
      </div>
    </div>
  )
}
