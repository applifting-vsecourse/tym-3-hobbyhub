import { useTranslation } from "react-i18next"

import type { Group } from "@/features/group/api/groupSchemas"

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
    <dl className="flex flex-col divide-y divide-border border-y border-border lg:border-x lg:px-4">
      <div className="flex flex-col gap-1 py-3">
        <dt className="typo-label-lg text-foreground">{t("groups.detail.facts.where")}</dt>
        <dd className="typo-small text-muted-foreground">
          {group.locationName ?? t("groups.detail.facts.whereNone")}
        </dd>
      </div>
      <div className="flex flex-col gap-1 py-3">
        <dt className="typo-label-lg text-foreground">{t("groups.detail.facts.when")}</dt>
        <dd className="typo-small text-muted-foreground">
          {when || t("groups.detail.facts.whenNone")}
        </dd>
      </div>
    </dl>
  )
}
