import { useTranslation } from "react-i18next"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupsMap } from "@/features/group/components/GroupsMap"

/**
 * Where and when a group meets (ADR-0028): the map, then the place and the
 * time in plain words. Only what the group put on its public page: the place as
 * a name, never the exact address. When the group meets is its own to tell, so
 * without it the row is not there.
 */
export function GroupFacts({ group, hasMap = true }: { group: Group; hasMap?: boolean }) {
  const { t } = useTranslation()
  const [onlyDay] = group.meetingDays
  const days =
    group.meetingDays.length === 1 && onlyDay
      ? t(`groups.weekdaysEvery.${onlyDay}`)
      : group.meetingDays.length > 1
        ? t("groups.detail.facts.everyWeek", {
            days: group.meetingDays.map((day) => t(`groups.weekdays.${day}`)).join(", "),
          })
        : null
  const when = [days, group.usualSchedule].filter(Boolean).join(", ")

  return (
    <section
      aria-labelledby="group-where-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="group-where-heading"
        className="typo-h3 text-foreground lg:sr-only"
      >
        {t("groups.detail.facts.title")}
      </h2>
      {/* Where the group meets, as a small map with the member count. */}
      {hasMap && group.latitude !== null ? (
        <GroupsMap
          groups={[group]}
          isFallbackShown={false}
          className="h-44 lg:h-48"
        />
      ) : null}
      <dl className="flex flex-col gap-3">
        <div className="flex flex-col">
          <dt className="typo-small text-muted-foreground">{t("groups.detail.facts.where")}</dt>
          <dd className="typo-body-lg text-foreground">
            {group.locationName ?? t("groups.detail.facts.whereNone")}
          </dd>
        </div>
        {when ? (
          <div className="flex flex-col">
            <dt className="typo-small text-muted-foreground">{t("groups.detail.facts.when")}</dt>
            <dd className="typo-body-lg text-foreground">{when}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
