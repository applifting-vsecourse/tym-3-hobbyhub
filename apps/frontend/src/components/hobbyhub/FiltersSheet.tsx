import { useId, useMemo, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  ActivityCombobox,
  type ActivityComboboxOption,
} from "@/components/hobbyhub/ActivityCombobox"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { thisWeekendRange, thisWeekRange } from "@/components/hobbyhub/filterDateRanges"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type EventFilters = {
  /** Activity ids (or the demo keys below) chosen in the combobox. */
  activities: string[]
  /** First day (YYYY-MM-DD) of the date range; empty means no lower bound. */
  dateFrom: string
  /** Last day (YYYY-MM-DD) of the date range; empty means no upper bound. */
  dateTo: string
  location: string
}

export const EMPTY_FILTERS: EventFilters = {
  activities: [],
  dateFrom: "",
  dateTo: "",
  location: "",
}

/** The longest text the location field takes; the server refuses more. */
export const FILTER_TEXT_MAX_LENGTH = 100

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
  /** Activities offered in the combobox; a few sample ones by default. */
  activityOptions?: ActivityComboboxOption[]
  /** Loading and error of the activities request, so the panel can say why there is no combobox. */
  activitiesState?: FilterActivitiesState
  /** Which filters the panel shows. A page offers only the ones it applies. */
  fields?: FiltersSheetField[]
  /** How the page sorts its results; the event list's soonest-first by default. */
  sortNote?: string
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
  sortNote,
  countResults,
  trigger,
}: FiltersSheetProps) {
  const { t } = useTranslation()
  const options = useMemo(
    () =>
      activityOptions ??
      DEMO_ACTIVITY_KEYS.map((key) => ({
        id: key,
        label: t(`hobbyhub.activities.${key}`),
        icon: key,
      })),
    [activityOptions, t],
  )
  const [draft, setDraft] = useState(value)
  const locationId = useId()
  const activityId = useId()
  const dateFromId = useId()
  const dateToId = useId()

  // Every opening starts from the filters that are actually applied, whether
  // the panel was opened by its trigger or by the parent.
  const [isPreviouslyOpen, setIsPreviouslyOpen] = useState(isOpen)
  if (isOpen !== isPreviouslyOpen) {
    setIsPreviouslyOpen(isOpen)
    if (isOpen) setDraft(value)
  }

  const isRangeReversed =
    draft.dateFrom !== "" && draft.dateTo !== "" && draft.dateFrom > draft.dateTo
  const week = thisWeekRange()
  const weekend = thisWeekendRange()
  // On a Sunday the week is the weekend; one chip then, so only one can be pressed.
  const presets = [
    ...(week.dateFrom === weekend.dateFrom && week.dateTo === weekend.dateTo
      ? []
      : [{ key: "week", range: week }]),
    { key: "weekend", range: weekend },
  ] as const

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
            if (isRangeReversed) return
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={activityId}>{t("hobbyhub.filters.activity")}</Label>
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
              <ActivityCombobox
                id={activityId}
                isMultiple
                options={options}
                value={draft.activities}
                onValueChange={(activities) => setDraft((current) => ({ ...current, activities }))}
                placeholder={t("hobbyhub.filters.activityPlaceholder")}
              />
            )}
            {/* The chosen ones as tags, each removed by one tap before the results are shown. */}
            {draft.activities.length > 0 ? (
              <div
                role="group"
                aria-label={t("hobbyhub.filters.chosenActivities")}
                className="flex flex-wrap gap-2 pt-1.5"
              >
                {draft.activities.map((id) => (
                  <FilterChip
                    key={id}
                    pressed
                    onPressedChange={() =>
                      setDraft((current) => ({
                        ...current,
                        activities: current.activities.filter((chosen) => chosen !== id),
                      }))
                    }
                  >
                    {options.find((option) => option.id === id)?.label ??
                      t("hobbyhub.activityCombobox.unknown")}
                    <X
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                  </FilterChip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {fields.includes("when") ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {presets.map(({ key, range }) => (
                <FilterChip
                  key={key}
                  pressed={draft.dateFrom === range.dateFrom && draft.dateTo === range.dateTo}
                  onPressedChange={(isPressed) =>
                    setDraft((current) => ({
                      ...current,
                      dateFrom: isPressed ? range.dateFrom : "",
                      dateTo: isPressed ? range.dateTo : "",
                    }))
                  }
                >
                  {t(`hobbyhub.filters.${key}`)}
                </FilterChip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={dateFromId}>{t("hobbyhub.filters.dateFrom")}</Label>
                <Input
                  id={dateFromId}
                  type="date"
                  value={draft.dateFrom}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dateFrom: event.target.value }))
                  }
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={dateToId}>{t("hobbyhub.filters.dateTo")}</Label>
                <Input
                  id={dateToId}
                  type="date"
                  value={draft.dateTo}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dateTo: event.target.value }))
                  }
                />
              </div>
            </div>
            {isRangeReversed ? (
              <p
                role="alert"
                className="typo-small text-destructive"
              >
                {t("hobbyhub.filters.dateRangeReversed")}
              </p>
            ) : null}
          </div>
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
        <p className="typo-small text-muted-foreground">
          {sortNote ?? t("hobbyhub.filters.sortNote")}
        </p>
      </div>
    </ResponsiveSheet>
  )
}
