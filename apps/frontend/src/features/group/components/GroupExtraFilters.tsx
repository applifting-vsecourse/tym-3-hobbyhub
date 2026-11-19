import { useId, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
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

import type { GroupApprovalMode } from "@/features/group/api/groupSchemas"

export type GroupExtraFilterValues = {
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

/** How many of the hidden filters are on, so a folded panel still says so. */
export const activeExtraFilterCount = (value: GroupExtraFilterValues): number =>
  Number(value.approvalMode !== undefined) +
  Number(value.onlyWithUpcomingEvent) +
  Number(value.radiusKm !== undefined)

/**
 * What the groups' list adds to the search and the activity filter (ADR-0028):
 * how a group takes people in, only the ones with an event ahead and the radius
 * around home. They are folded away under one "Filtry" button, which says how
 * many are on; the order stays in sight beside it. The URL keeps all of it.
 */
export function GroupExtraFilters({ value, onChange, canUseDistance }: Props) {
  const { t } = useTranslation()
  const panelId = useId()
  const upcomingId = useId()
  const count = activeExtraFilterCount(value)
  // Open from the start when a link brought filters along: they are not a secret.
  const [isOpen, setIsOpen] = useState(count > 0)
  const set = (patch: Partial<GroupExtraFilterValues>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((isOpenBefore) => !isOpenBefore)}
        >
          {t("groups.list.filters.title")}
          {count > 0 ? <span className="text-primary">({count})</span> : null}
          <ChevronDownIcon
            aria-hidden
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              isOpen && "rotate-180",
            )}
          />
        </Button>

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

      {isOpen ? (
        <div
          id={panelId}
          className="flex flex-col gap-4 border-y border-border py-4"
        >
          <div
            role="group"
            aria-label={t("groups.list.filters.approval")}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="typo-label-lg text-foreground">
              {t("groups.list.filters.approval")}
            </span>
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

          {count > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                onChange({
                  ...value,
                  approvalMode: undefined,
                  onlyWithUpcomingEvent: false,
                  radiusKm: undefined,
                  sort: value.sort === "nearest" ? "newest" : value.sort,
                })
              }
            >
              {t("groups.list.filters.clear")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
