import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export type EventFilters = {
  /** Activity ids (or the demo keys below) of the pressed chips. */
  activities: string[]
  when: "week" | "weekend" | "date" | null
  location: string
}

export const EMPTY_FILTERS: EventFilters = { activities: [], when: null, location: "" }

const WHEN_OPTIONS = ["week", "weekend", "date"] as const

/** The longest text the location field takes; the server refuses more. */
export const FILTER_TEXT_MAX_LENGTH = 100

export type FilterActivityOption = { value: string; label: string }
export type FiltersSheetField = "activity" | "when" | "location"

const DEMO_ACTIVITY_KEYS = ["florbal", "deskove-hry", "volejbal", "tenis"] as const

/** State of the request the activity options come from. */
export type FilterActivitiesState = {
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

type FiltersSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: EventFilters
  onApply: (filters: EventFilters) => void
  /** Activities offered as chips; the most common ones by default. */
  activityOptions?: FilterActivityOption[]
  /** Loading and error of the activities request, so the panel can say why there are no chips. */
  activitiesState?: FilterActivitiesState
  /** Which filters the panel shows. A page offers only the ones it applies. */
  fields?: FiltersSheetField[]
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
  activityOptions,
  activitiesState,
  fields = ["activity", "when", "location"],
  countResults,
  trigger,
}: FiltersSheetProps) {
  const { t } = useTranslation()
  const options =
    activityOptions ??
    DEMO_ACTIVITY_KEYS.map((key) => ({ value: key, label: t(`hobbyhub.activities.${key}`) }))
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

  const toggleActivity = (activity: string, isPressed: boolean) =>
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
        {fields.includes("activity") ? (
          <>
            <p
              id={activityLabelId}
              className="typo-label-lg text-foreground"
            >
              {t("hobbyhub.filters.activity")}
            </p>
            {activitiesState?.isLoading ? (
              <p
                role="status"
                className="typo-small text-muted-foreground"
              >
                {t("hobbyhub.filters.activitiesLoading")}
              </p>
            ) : activitiesState?.error && options.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>{t("hobbyhub.filters.activitiesError")}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={activitiesState.onRetry}
                  >
                    {t("hobbyhub.filters.activitiesRetry")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : options.length === 0 ? (
              <p className="typo-small text-muted-foreground">
                {t("hobbyhub.filters.activitiesEmpty")}
              </p>
            ) : (
              <div
                role="group"
                aria-labelledby={activityLabelId}
                className="flex flex-wrap gap-2"
              >
                {options.map(({ value: activity, label }) => (
                  <FilterChip
                    key={activity}
                    pressed={draft.activities.includes(activity)}
                    onPressedChange={(isPressed) => toggleActivity(activity, isPressed)}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            )}
          </>
        ) : null}

        {fields.includes("when") ? (
          <>
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
          </>
        ) : null}

        {/* TODO(F-02.1b #91): a text for now. Later a place picker with a radius
            and distance from it, once events have coordinates (geocoding, F-12.3). */}
        {fields.includes("location") ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={locationId}>{t("hobbyhub.filters.location")}</Label>
            <Input
              id={locationId}
              maxLength={FILTER_TEXT_MAX_LENGTH}
              placeholder={t("hobbyhub.filters.locationPlaceholder")}
              value={draft.location}
              onChange={(event) =>
                setDraft((current) => ({ ...current, location: event.target.value }))
              }
            />
          </div>
        ) : null}
        <p className="typo-small text-muted-foreground">{t("hobbyhub.filters.sortNote")}</p>
      </div>
    </ResponsiveSheet>
  )
}
