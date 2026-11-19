import { useTranslation } from "react-i18next"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupsMap } from "@/features/group/components/GroupsMap"

/**
 * Where and when a group meets, beside its membership (ADR-0028). Only what the
 * group put on its public page: the place as a name, never the exact address.
 */
export function GroupFacts({ group }: { group: Group }) {
  const { t } = useTranslation()
  const days = group.meetingDays.map((day) => t(`groups.weekdaysLong.${day}`)).join(", ")
  const when = [days ? t("groups.detail.facts.every", { day: days }) : null, group.usualSchedule]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="flex flex-col gap-3">
      {/* Where the group meets, as a small map with the member count (ADR-0028). */}
      {group.latitude !== null ? (
        <GroupsMap
          groups={[group]}
          isFallbackShown={false}
          className="h-48"
        />
      ) : null}
      {/* Hairlines only where there is room; on a phone the facts are just spaced apart. */}
      <dl className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-border lg:rounded-lg lg:border lg:border-border lg:px-4">
        <div className="flex flex-col gap-1 lg:py-3">
          <dt className="typo-label-lg text-foreground">{t("groups.detail.facts.where")}</dt>
          <dd className="typo-small text-muted-foreground">
            {group.locationName ?? t("groups.detail.facts.whereNone")}
          </dd>
        </div>
        {/* When the group meets is its own to tell: without it the row is not there. */}
        {when ? (
          <div className="flex flex-col gap-1 lg:py-3">
            <dt className="typo-label-lg text-foreground">{t("groups.detail.facts.when")}</dt>
            <dd className="typo-small text-muted-foreground">{when}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
