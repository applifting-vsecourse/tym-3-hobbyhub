import { useId, useState } from "react"
import { PanelLeftClose } from "lucide-react"
import { useTranslation } from "react-i18next"

import FiltersIcon from "@/assets/ui-icons/filters.svg?react"
import type { ActivityComboboxOption } from "@/components/hobbyhub/ActivityCombobox"
import {
  EMPTY_FILTERS,
  filterDraftErrors,
  FiltersFields,
  useActivityChoices,
  type EventFilters,
  type FilterActivitiesState,
  type FiltersSheetField,
} from "@/components/hobbyhub/FiltersSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FiltersPanelProps = {
  /** The filters that are applied (the page's address). */
  value: EventFilters
  onApply: (filters: EventFilters) => void
  /** Folded to a narrow strip, so the results get the room. */
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  /** How many filters are applied, shown on the folded strip. */
  activeCount: number
  activityOptions?: ActivityComboboxOption[]
  activitiesState?: FilterActivitiesState
  fields?: FiltersSheetField[]
  sortNote?: string
  className?: string
}

/**
 * Filtry beside the results on a large screen (#224): the fields of the bottom
 * panel, always open. Changes are a draft until "Použít", as in the dialog, so
 * several filters are chosen and applied at once. The panel folds into a strip
 * that still says how many filters are on.
 */
export function FiltersPanel({
  value,
  onApply,
  isExpanded,
  onExpandedChange,
  activeCount,
  activityOptions,
  activitiesState,
  fields = ["activity", "when", "location"],
  sortNote,
  className,
}: FiltersPanelProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const bodyId = useId()
  const options = useActivityChoices(activityOptions)
  const [draft, setDraft] = useState(value)
  // The applied filters also change outside the panel (a chip removed, "clear
  // the filters" in an empty list); the draft starts again from them.
  const valueKey = JSON.stringify(value)
  const [appliedKey, setAppliedKey] = useState(valueKey)
  if (valueKey !== appliedKey) {
    setAppliedKey(valueKey)
    setDraft(value)
  }
  const isUnapplied = JSON.stringify(draft) !== valueKey

  if (!isExpanded) {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={false}
          aria-label={
            activeCount > 0
              ? `${t("hobbyhub.filters.panelShow")} (${t("hobbyhub.filters.activeCount", { count: activeCount })})`
              : t("hobbyhub.filters.panelShow")
          }
          onClick={() => onExpandedChange(true)}
          className="relative text-foreground"
        >
          <FiltersIcon className="size-5" />
          {activeCount > 0 ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary typo-caption text-primary-foreground"
            >
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>
    )
  }

  return (
    <aside
      aria-labelledby={titleId}
      className={cn("flex w-72 flex-col", className)}
    >
      <div className="flex items-center gap-2 pb-3">
        <p
          id={titleId}
          className="mr-auto typo-title text-foreground"
        >
          {t("hobbyhub.filters.title")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft(EMPTY_FILTERS)}
        >
          {t("hobbyhub.filters.clear")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded
          aria-controls={bodyId}
          aria-label={t("hobbyhub.filters.panelHide")}
          onClick={() => onExpandedChange(false)}
        >
          <PanelLeftClose
            aria-hidden
            className="size-5"
          />
        </Button>
      </div>
      <div
        id={bodyId}
        className="flex flex-col gap-4"
      >
        <FiltersFields
          draft={draft}
          onDraftChange={setDraft}
          fields={fields}
          options={options}
          activitiesState={activitiesState}
          sortNote={sortNote}
        />
        {/* Stays in view at the bottom of a tall panel, so it is never scrolled away. */}
        <div className="sticky bottom-0 flex flex-col gap-2 bg-background pt-2 pb-1">
          {isUnapplied ? (
            <p
              role="status"
              className="typo-small text-muted-foreground"
            >
              {t("hobbyhub.filters.unapplied")}
            </p>
          ) : null}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (filterDraftErrors(draft).hasErrors) return
              onApply(draft)
            }}
          >
            {t("hobbyhub.filters.apply")}
          </Button>
        </div>
      </div>
    </aside>
  )
}
