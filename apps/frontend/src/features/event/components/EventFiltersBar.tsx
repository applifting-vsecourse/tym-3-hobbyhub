import { useState, type ReactNode } from "react"
import type { TFunction } from "i18next"
import { CalendarDays, MapPin, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ActivityComboboxOption } from "@/components/hobbyhub/ActivityCombobox"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import {
  EMPTY_FILTERS,
  FiltersSheet,
  type FilterActivitiesState,
  type FiltersSheetField,
} from "@/components/hobbyhub/FiltersSheet"
import { SearchField } from "@/components/hobbyhub/SearchField"

import {
  EVENT_SEARCH_MAX_LENGTH,
  type EventFilterChange,
  type EventFilterValues,
} from "@/features/event/lib/eventsSearch"

// "15. 11. – 30. 11.", "od 15. 11." or "do 30. 11."; nothing without a date.
const dateRangeLabel = (t: TFunction, language: string, from: string, to: string) => {
  const formatter = new Intl.DateTimeFormat(language, { day: "numeric", month: "numeric" })
  const format = (isoDay: string) => formatter.format(new Date(`${isoDay}T00:00`))
  if (from && to) return t("events.list.filters.dateRange", { from: format(from), to: format(to) })
  if (from) return t("events.list.filters.dateFrom", { date: format(from) })
  if (to) return t("events.list.filters.dateTo", { date: format(to) })
  return ""
}

type EventFiltersBarProps = {
  /** The filters in the address. */
  filters: EventFilterValues
  /** The address holds a range that ends before it starts; it is not applied. */
  isRangeReversed: boolean
  /** What is typed in the search field, ahead of the address (`useSearchText`). */
  searchText: string
  onSearchTextChange: (text: string) => void
  onFiltersChange: (next: EventFilterChange) => void
  /** The activities to pick from, translated; the activity feature owns them. */
  activityOptions: ActivityComboboxOption[]
  /** Loading and error of the activities, so the panel can say why there is no picker. */
  activitiesState: FilterActivitiesState
  /** The filters the panel offers; all of them by default. */
  fields?: FiltersSheetField[]
  /** Hint of the search field; the event list's by default. */
  searchPlaceholder?: string
  /** How the page sorts its results, said in the panel; the event list's by default. */
  sortNote?: string
  /** Chips the page adds in front of the chosen filters, e.g. "Nejblíž mně". */
  leadingChips?: ReactNode
  /** Messages of the page under the bar. */
  children?: ReactNode
}

/**
 * Search and filters of an event listing (#177: the event list and "Moje
 * akce" alike): the pill search field, the filters panel it opens, and the
 * chosen filters as chips that remove themselves.
 */
export function EventFiltersBar({
  filters,
  isRangeReversed,
  searchText,
  onSearchTextChange,
  onFiltersChange,
  activityOptions,
  activitiesState,
  fields = ["activity", "when", "location"],
  searchPlaceholder,
  sortNote,
  leadingChips,
  children,
}: EventFiltersBarProps) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  // An id from the address that is no activity (retired, mistyped) still gets a
  // chip, so the filter can always be seen and removed.
  // They do not wait for the activities request: a failed one must not hide an active filter.
  const selectedActivities = filters.activityIds.map((id) => ({
    id,
    label: activityOptions.find((option) => option.id === id)?.label,
  }))
  const dateLabel = dateRangeLabel(t, i18n.language, filters.dateFrom, filters.dateTo)
  const hasChips = selectedActivities.length > 0 || filters.location !== "" || dateLabel !== ""

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        label={t("hobbyhub.search.label")}
        placeholder={searchPlaceholder ?? t("events.list.searchPlaceholder")}
        maxLength={EVENT_SEARCH_MAX_LENGTH}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        onOpenFilters={() => setIsOpen(true)}
      />
      <FiltersSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        value={{
          ...EMPTY_FILTERS,
          activities: filters.activityIds,
          location: filters.location,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        }}
        onApply={(applied) =>
          onFiltersChange({
            activityIds: applied.activities,
            location: applied.location,
            dateFrom: applied.dateFrom,
            dateTo: applied.dateTo,
          })
        }
        fields={fields}
        sortNote={sortNote}
        activitiesState={activitiesState}
        activityOptions={activityOptions}
      />
      {leadingChips || hasChips ? (
        <div className="flex flex-wrap items-center gap-2">
          {leadingChips}
          {hasChips ? (
            <div
              role="group"
              aria-label={t("events.list.filters.selected")}
              className="flex flex-wrap gap-2"
            >
              {selectedActivities.map((item) => (
                <FilterChip
                  key={item.id}
                  pressed
                  onPressedChange={() =>
                    onFiltersChange({
                      activityIds: filters.activityIds.filter((id) => id !== item.id),
                    })
                  }
                >
                  {item.label ?? t("events.list.filters.unknownActivity")}
                  <X
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </FilterChip>
              ))}
              {filters.location ? (
                <FilterChip
                  pressed
                  onPressedChange={() => onFiltersChange({ location: "" })}
                >
                  <MapPin
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  {filters.location}
                  <X
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </FilterChip>
              ) : null}
              {dateLabel ? (
                <FilterChip
                  pressed
                  onPressedChange={() => onFiltersChange({ dateFrom: "", dateTo: "" })}
                >
                  <CalendarDays
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  {dateLabel}
                  <X
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </FilterChip>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {isRangeReversed ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {t("hobbyhub.filters.dateRangeReversed")}
        </p>
      ) : null}
      {children}
    </div>
  )
}
