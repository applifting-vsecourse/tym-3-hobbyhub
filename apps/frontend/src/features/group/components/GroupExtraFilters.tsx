import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import { MEETING_DAYS, type GroupApprovalMode } from "@/features/group/api/groupSchemas"

export type GroupExtraFilterValues = {
  weekdays: number[]
  approvalMode?: GroupApprovalMode
  onlyWithUpcomingEvent: boolean
  sort: "newest" | "nearest" | "members"
  /** Only with a home address; the radius is around it. */
  radiusKm?: number
}

const RADII = [5, 15, 30, 50] as const
const ANY = "ANY"

type Props = {
  value: GroupExtraFilterValues
  onChange: (next: GroupExtraFilterValues) => void
  /** Distance needs a place to measure from: the viewer's home address. */
  canUseDistance: boolean
}

const chipClass = cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")

/**
 * What the groups' own list adds to the event list's filters (ADR-0028): the
 * days a group meets on, how it takes people in, only the ones with an event
 * ahead, the radius and the order. One row of chips and small fields; the URL
 * keeps them, so a link carries the filter.
 */
export function GroupExtraFilters({ value, onChange, canUseDistance }: Props) {
  const { t } = useTranslation()
  const upcomingId = useId()
  const set = (patch: Partial<GroupExtraFilterValues>) => onChange({ ...value, ...patch })
  const toggleDay = (day: number) =>
    set({
      weekdays: value.weekdays.includes(day)
        ? value.weekdays.filter((each) => each !== day)
        : [...value.weekdays, day].sort(),
    })

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={t("groups.list.filters.weekdays")}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="typo-label-lg text-foreground">{t("groups.list.filters.weekdays")}</span>
        {MEETING_DAYS.map((day) => {
          const isOn = value.weekdays.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isOn}
              data-state={isOn ? "on" : "off"}
              className={chipClass}
              onClick={() => toggleDay(day)}
            >
              {t(`groups.weekdays.${day}`)}
            </button>
          )
        })}
      </div>

      <div
        role="group"
        aria-label={t("groups.list.filters.approval")}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="typo-label-lg text-foreground">{t("groups.list.filters.approval")}</span>
        {[undefined, "OPEN", "APPROVAL"].map((mode) => {
          const isOn = value.approvalMode === mode
          return (
            <button
              key={mode ?? "all"}
              type="button"
              aria-pressed={isOn}
              data-state={isOn ? "on" : "off"}
              className={chipClass}
              onClick={() => set({ approvalMode: mode as GroupApprovalMode | undefined })}
            >
              {mode ? t(`groups.approval.${mode}`) : t("groups.list.filters.approvalAll")}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-h-11 items-center gap-3 md:min-h-9">
          <Checkbox
            id={upcomingId}
            checked={value.onlyWithUpcomingEvent}
            onCheckedChange={(checked) => set({ onlyWithUpcomingEvent: checked === true })}
          />
          <Label htmlFor={upcomingId}>{t("groups.list.filters.upcoming")}</Label>
        </div>

        {canUseDistance ? (
          <div className="flex items-center gap-2">
            <Label>{t("groups.list.filters.radius")}</Label>
            <Select
              value={value.radiusKm ? String(value.radiusKm) : ANY}
              onValueChange={(next) =>
                set({
                  radiusKm: next === ANY ? undefined : Number(next),
                  sort: next === ANY && value.sort === "nearest" ? "newest" : value.sort,
                })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("groups.list.filters.approvalAll")}</SelectItem>
                {RADII.map((km) => (
                  <SelectItem
                    key={km}
                    value={String(km)}
                  >
                    {t("groups.list.filters.radiusValue", { km })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Label>{t("groups.list.filters.sort")}</Label>
          <Select
            value={value.sort}
            onValueChange={(next) => set({ sort: next as GroupExtraFilterValues["sort"] })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("groups.list.filters.sortNewest")}</SelectItem>
              <SelectItem value="members">{t("groups.list.filters.sortMembers")}</SelectItem>
              {canUseDistance && value.radiusKm ? (
                <SelectItem value="nearest">{t("groups.list.filters.sortNearest")}</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
