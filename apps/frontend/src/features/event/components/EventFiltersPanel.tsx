import type { ActivityComboboxOption } from "@/components/hobbyhub/ActivityCombobox"
import { FiltersPanel } from "@/components/hobbyhub/FiltersPanel"
import type { FilterActivitiesState, FiltersSheetField } from "@/components/hobbyhub/FiltersSheet"
import type { FiltersPanelState } from "@/hooks/useFiltersPanel"

import { fromPanelFilters, toPanelFilters } from "@/features/event/components/EventFiltersBar"
import {
  activeFilterCount,
  type EventFilterChange,
  type EventFilterValues,
} from "@/features/event/lib/eventsSearch"

type EventFiltersPanelProps = {
  /** The filters in the address. */
  filters: EventFilterValues
  onFiltersChange: (next: EventFilterChange) => void
  /** Room for the panel and whether it is folded (`useFiltersPanel`). */
  panel: FiltersPanelState
  fields?: FiltersSheetField[]
  activityOptions: ActivityComboboxOption[]
  activitiesState: FilterActivitiesState
  sortNote?: string
  className?: string
}

/**
 * The filters of an event or group listing in a side panel on a large screen
 * (#224), the same ones the search field's dialog offers below it. Nothing
 * where there is no room: the page then has the dialog.
 */
export function EventFiltersPanel({
  filters,
  onFiltersChange,
  panel,
  fields = ["activity", "when", "location"],
  activityOptions,
  activitiesState,
  sortNote,
  className,
}: EventFiltersPanelProps) {
  if (!panel.isWide) return null

  return (
    <FiltersPanel
      value={toPanelFilters(filters)}
      onApply={(applied) => onFiltersChange(fromPanelFilters(applied, fields))}
      isExpanded={panel.isExpanded}
      onExpandedChange={panel.setExpanded}
      activeCount={activeFilterCount(filters)}
      fields={fields}
      activityOptions={activityOptions}
      activitiesState={activitiesState}
      sortNote={sortNote}
      className={className}
    />
  )
}

/**
 * The filters button of the search field next to the panel: it opens a folded
 * panel and is not there while the panel is open; below the panel's breakpoint
 * it opens the dialog as before.
 */
export const panelFiltersButton = (panel: FiltersPanelState) =>
  panel.isWide ? (panel.isExpanded ? null : () => panel.setExpanded(true)) : undefined

/** The open panel shows the chosen filters itself; the chips under the field return when it is folded. */
export const isPanelOpen = (panel: FiltersPanelState) => panel.isWide && panel.isExpanded
