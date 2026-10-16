import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import type { Activity } from "@/components/hobbyhub/ActivityIcon"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type EventFilters = {
  activities: Activity[]
  when: "week" | "weekend" | "date" | null
  location: string
}

export const EMPTY_FILTERS: EventFilters = { activities: [], when: null, location: "" }

const WHEN_OPTIONS = ["week", "weekend", "date"] as const

type FiltersSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: EventFilters
  onApply: (filters: EventFilters) => void
  /** Activities offered as chips; the most common ones by default. */
  activityOptions?: Activity[]
  /** How many events the current draft would show, for the button label. */
  countResults?: (filters: EventFilters) => number
  trigger?: ReactNode
}

/**
 * Filtry — the bottom panel opened from the search field. Changes are a draft
 * until "Zobrazit…", so closing the panel never filters by accident.
 */
export function FiltersSheet({
  isOpen,
  onOpenChange,
  value,
  onApply,
  activityOptions = ["florbal", "deskove-hry", "volejbal", "tenis"],
  countResults,
  trigger,
}: FiltersSheetProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const locationId = useId()
  const activityLabelId = useId()
  const whenLabelId = useId()

  // Every opening starts from the filters that are actually applied, whether
  // the panel was opened by its trigger or by the parent.
  const [isPreviouslyOpen, setIsPreviouslyOpen] = useState(isOpen)
  if (isOpen !== isPreviouslyOpen) {
    setIsPreviouslyOpen(isOpen)
    if (isOpen) setDraft(value)
  }

  const toggleActivity = (activity: Activity, isPressed: boolean) =>
    setDraft((current) => ({
      ...current,
      activities: isPressed
        ? [...current.activities, activity]
        : current.activities.filter((item) => item !== activity),
    }))

  const resultLabel = countResults
    ? t("hobbyhub.filters.results", { count: countResults(draft) })
    : t("hobbyhub.filters.showResults")

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t("hobbyhub.filters.title")}
      headerAction={
        <Button
          variant="ghost"
          size="sm"
          className="h-11 md:h-9"
          onClick={() => setDraft(EMPTY_FILTERS)}
        >
          {t("hobbyhub.filters.clear")}
        </Button>
      }
      footer={
        <Button
          className="w-full"
          onClick={() => {
            onApply(draft)
            onOpenChange(false)
          }}
        >
          {resultLabel}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p
          id={activityLabelId}
          className="typo-label-lg text-foreground"
        >
          {t("hobbyhub.filters.activity")}
        </p>
        <div
          role="group"
          aria-labelledby={activityLabelId}
          className="flex flex-wrap gap-2"
        >
          {activityOptions.map((activity) => (
            <FilterChip
              key={activity}
              pressed={draft.activities.includes(activity)}
              onPressedChange={(isPressed) => toggleActivity(activity, isPressed)}
            >
              {t(`hobbyhub.activities.${activity}`)}
            </FilterChip>
          ))}
        </div>

        <p
          id={whenLabelId}
          className="typo-label-lg text-foreground"
        >
          {t("hobbyhub.filters.when")}
        </p>
        <ToggleGroup
          type="single"
          variant="chip"
          spacing={2}
          aria-labelledby={whenLabelId}
          value={draft.when ?? ""}
          onValueChange={(next) =>
            setDraft((current) => ({
              ...current,
              when: next ? (next as EventFilters["when"]) : null,
            }))
          }
          className="flex-wrap"
        >
          {WHEN_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="h-11 px-3 md:h-9"
            >
              {t(`hobbyhub.filters.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={locationId}>{t("hobbyhub.filters.location")}</Label>
          <Input
            id={locationId}
            placeholder={t("hobbyhub.filters.locationPlaceholder")}
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({ ...current, location: event.target.value }))
            }
          />
        </div>
        <p className="typo-small text-muted-foreground">{t("hobbyhub.filters.sortNote")}</p>
      </div>
    </ResponsiveSheet>
  )
}
