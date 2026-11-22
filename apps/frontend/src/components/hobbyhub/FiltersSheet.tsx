import { useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  ActivityCombobox,
  type ActivityComboboxOption,
} from "@/components/hobbyhub/ActivityCombobox"
import { AddressSearch } from "@/components/hobbyhub/AddressSearch"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { thisWeekendRange, thisWeekRange } from "@/components/hobbyhub/filterDateRanges"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type GroupApprovalFilter = "" | "OPEN" | "APPROVAL"
export type GroupSortFilter = "newest" | "members" | "nearest"

/** The place picked for the radius filter (#261): the line of its address and its position. */
export type PlaceFilter = { label: string; latitude: number; longitude: number }

/** The radii offered around a place, in km, and the one preselected with it. The server takes up to the last. */
export const RADIUS_OPTIONS_KM = [5, 10, 25, 50] as const
export const DEFAULT_RADIUS_KM = 10

export type EventFilters = {
  /** Activity ids (or the demo keys below) chosen in the combobox. */
  activities: string[]
  /** First day (YYYY-MM-DD) of the date range; empty means no lower bound. */
  dateFrom: string
  /** Last day (YYYY-MM-DD) of the date range; empty means no upper bound. */
  dateTo: string
  location: string
  /** The place and radius of the public list (#261); no place means no radius filter. */
  place: PlaceFilter | null
  radiusKm: number
  /** Only events with a free seat. */
  freeSpotsOnly: boolean
  /** #215: only events that start within a few hours ("Last minute"). */
  lastMinute: boolean
  /** Ranges as typed (number text); empty means no bound. Price in CZK, duration in hours. */
  priceFrom: string
  priceTo: string
  hoursFrom: string
  hoursTo: string
  capacityFrom: string
  capacityTo: string
  /** Groups (ADR-0028): how a group takes people in; empty means either way. */
  approvalMode: GroupApprovalFilter
  /** Groups: only the ones with an event ahead. */
  hasUpcomingEvent: boolean
  /** Groups: the order of the list. */
  groupSort: GroupSortFilter
}

export const EMPTY_FILTERS: EventFilters = {
  activities: [],
  dateFrom: "",
  dateTo: "",
  location: "",
  place: null,
  radiusKm: DEFAULT_RADIUS_KM,
  freeSpotsOnly: false,
  lastMinute: false,
  priceFrom: "",
  priceTo: "",
  hoursFrom: "",
  hoursTo: "",
  capacityFrom: "",
  capacityTo: "",
  approvalMode: "",
  hasUpcomingEvent: false,
  groupSort: "newest",
}

/** The longest text the location field takes; the server refuses more. */
export const FILTER_TEXT_MAX_LENGTH = 100

export type FiltersSheetField =
  | "activity"
  | "when"
  | "location"
  | "place"
  | "freeSpots"
  | "price"
  | "duration"
  | "capacity"
  // Only for groups (ADR-0028).
  | "approval"
  | "upcomingEvent"
  | "groupSort"

/** True when both ends are set and the start is past the end. Empty or missing means open. */
export const isNumberRangeReversed = (from: string | number = "", to: string | number = "") =>
  from !== "" && to !== "" && Number(from) > Number(to)

/**
 * What the server takes of each range (#214): it refuses more with a 400, so
 * the panel and the address keep to it. Price in CZK, duration in hours.
 */
export const RANGE_LIMITS = {
  price: { max: 99_999_999.99, isInteger: false },
  duration: { max: 744, isInteger: false },
  capacity: { max: 500, isInteger: true },
} as const

type RangeLimitKind = keyof typeof RANGE_LIMITS

/** A non-negative number within the limit of its range, with at most two decimals; empty is no bound. */
export const isRangeValueValid = (kind: RangeLimitKind, value: string | number): boolean => {
  if (value === "") return true
  const { max, isInteger } = RANGE_LIMITS[kind]
  const text = String(value)
  const pattern = isInteger ? /^\d+$/ : /^\d+(\.\d{1,2})?$/
  return pattern.test(text) && Number(text) <= max
}

type RangeKind = "price" | "duration" | "capacity"

type RangePreset = { key: string; from: string; to: string }

/**
 * The ready-made choices of each range (#214): most people pick one of these
 * instead of typing numbers. The edges are inclusive and meet, so every event
 * falls into at least one choice. Price in CZK, duration in hours.
 */
const RANGE_PRESETS = {
  price: [
    { key: "free", from: "", to: "0" },
    { key: "upTo100", from: "", to: "100" },
    { key: "upTo300", from: "", to: "300" },
    { key: "from300", from: "300", to: "" },
  ],
  duration: [
    { key: "upTo1", from: "", to: "1" },
    { key: "from1To2", from: "1", to: "2" },
    { key: "from2To4", from: "2", to: "4" },
    { key: "from4", from: "4", to: "" },
  ],
  capacity: [
    { key: "upTo6", from: "", to: "6" },
    { key: "from7To12", from: "7", to: "12" },
    { key: "from13", from: "13", to: "" },
  ],
} as const satisfies Record<RangeKind, readonly RangePreset[]>

type RangeFieldProps = {
  kind: RangeKind
  label: string
  from: string
  to: string
  step: string
  onChange: (range: { from: string; to: string }) => void
}

/**
 * One range as a row of ready-made choices; "Vlastní" opens a "from" and a "to"
 * field for anything else. A range typed by hand (or read from a link) that no
 * choice matches opens the fields by itself, so it can always be seen and fixed.
 */
function RangeField({ kind, label, from, to, step, onChange }: RangeFieldProps) {
  const { t } = useTranslation()
  const rangeId = useId()
  const presets: readonly RangePreset[] = RANGE_PRESETS[kind]
  const matches = (preset: RangePreset) => preset.from === from && preset.to === to
  const hasCustomValue = (from !== "" || to !== "") && !presets.some(matches)
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  // Typing opens the fields for good: they must not vanish when the text is
  // cleared or happens to equal a choice.
  const isCustomShown = isCustomOpen || hasCustomValue
  const type = (next: { from: string; to: string }) => {
    setIsCustomOpen(true)
    onChange(next)
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 typo-small text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <FilterChip
            key={preset.key}
            pressed={matches(preset)}
            onPressedChange={(isPressed) => {
              setIsCustomOpen(false)
              onChange(isPressed ? { from: preset.from, to: preset.to } : { from: "", to: "" })
            }}
          >
            {t(`hobbyhub.filters.preset.${kind}.${preset.key}`)}
          </FilterChip>
        ))}
        <FilterChip
          pressed={isCustomShown}
          onPressedChange={(isPressed) => {
            setIsCustomOpen(isPressed)
            if (!isPressed) onChange({ from: "", to: "" })
          }}
        >
          {t("hobbyhub.filters.preset.custom")}
        </FilterChip>
      </div>
      {isCustomShown ? (
        <div className="grid grid-cols-2 gap-3">
          {(["from", "to"] as const).map((end) => (
            <div
              key={end}
              className="flex min-w-0 flex-col gap-1.5"
            >
              <Label htmlFor={`${rangeId}-${end}`}>
                {t(end === "from" ? "hobbyhub.filters.rangeFrom" : "hobbyhub.filters.rangeTo")}
              </Label>
              <Input
                id={`${rangeId}-${end}`}
                type="number"
                inputMode={RANGE_LIMITS[kind].isInteger ? "numeric" : "decimal"}
                min={0}
                max={RANGE_LIMITS[kind].max}
                step={step}
                aria-label={`${label}: ${t(end === "from" ? "hobbyhub.filters.rangeFrom" : "hobbyhub.filters.rangeTo")}`}
                value={end === "from" ? from : to}
                onChange={(event) =>
                  type(
                    end === "from"
                      ? { from: event.target.value, to }
                      : { from, to: event.target.value },
                  )
                }
              />
            </div>
          ))}
        </div>
      ) : null}
    </fieldset>
  )
}

const DEMO_ACTIVITY_KEYS = ["florbal", "deskove-hry", "volejbal", "tenis"] as const

/** State of the request the activity options come from. */
export type FilterActivitiesState = {
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

/** What is wrong with a draft; one that has anything wrong is not applied. */
export const filterDraftErrors = (draft: EventFilters) => {
  const isDateReversed =
    draft.dateFrom !== "" && draft.dateTo !== "" && draft.dateFrom > draft.dateTo
  const isNumberReversed =
    isNumberRangeReversed(draft.priceFrom, draft.priceTo) ||
    isNumberRangeReversed(draft.hoursFrom, draft.hoursTo) ||
    isNumberRangeReversed(draft.capacityFrom, draft.capacityTo)
  const isNumberInvalid =
    !isRangeValueValid("price", draft.priceFrom) ||
    !isRangeValueValid("price", draft.priceTo) ||
    !isRangeValueValid("duration", draft.hoursFrom) ||
    !isRangeValueValid("duration", draft.hoursTo) ||
    !isRangeValueValid("capacity", draft.capacityFrom) ||
    !isRangeValueValid("capacity", draft.capacityTo)
  return {
    isDateReversed,
    isNumberReversed,
    isNumberInvalid,
    hasErrors: isDateReversed || isNumberReversed || isNumberInvalid,
  }
}

/** The activities offered in the combobox: the page's, or a few sample ones on the design-system page. */
export function useActivityChoices(activityOptions?: ActivityComboboxOption[]) {
  const { t } = useTranslation()
  return useMemo(
    () =>
      activityOptions ??
      DEMO_ACTIVITY_KEYS.map((key) => ({
        id: key,
        label: t(`hobbyhub.activities.${key}`),
        icon: key,
      })),
    [activityOptions, t],
  )
}

type FiltersFieldsProps = {
  draft: EventFilters
  onDraftChange: Dispatch<SetStateAction<EventFilters>>
  fields: FiltersSheetField[]
  options: ActivityComboboxOption[]
  activitiesState?: FilterActivitiesState
  sortNote?: string
}

/**
 * The fields of the filters with their messages: the same in the bottom panel
 * on a phone and in the side panel of a large screen (#224), so the two never
 * drift apart.
 */
export function FiltersFields({
  draft,
  onDraftChange: setDraft,
  fields,
  options,
  activitiesState,
  sortNote,
}: FiltersFieldsProps) {
  const { t } = useTranslation()
  const locationId = useId()
  const placeId = useId()
  const activityId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  const { isDateReversed, isNumberReversed, isNumberInvalid } = filterDraftErrors(draft)
  const week = thisWeekRange()
  const weekend = thisWeekendRange()
  // On a Sunday the week is the weekend; one chip then, so only one can be pressed.
  const presets = [
    ...(week.dateFrom === weekend.dateFrom && week.dateTo === weekend.dateTo
      ? []
      : [{ key: "week", range: week }]),
    { key: "weekend", range: weekend },
  ] as const

  return (
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
          {isDateReversed ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("hobbyhub.filters.dateRangeReversed")}
            </p>
          ) : null}
        </div>
      ) : null}

      {fields.includes("place") ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={placeId}>{t("hobbyhub.filters.place")}</Label>
          <div className="flex items-center gap-2">
            <AddressSearch
              id={placeId}
              value={draft.place?.label ?? ""}
              placeholder={t("hobbyhub.filters.placePlaceholder")}
              className="min-w-0 flex-1"
              onSelect={({ label, latitude, longitude }) =>
                setDraft((current) => ({
                  ...current,
                  place: { label, latitude, longitude },
                  // A picked place always comes with a radius.
                  radiusKm: current.place ? current.radiusKm : DEFAULT_RADIUS_KM,
                }))
              }
              // A street without a house number is a place to measure from too.
              isStreetAllowed
            />
            {draft.place ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 md:size-9"
                aria-label={t("hobbyhub.filters.placeClear")}
                onClick={() => setDraft((current) => ({ ...current, place: null }))}
              >
                <X aria-hidden />
              </Button>
            ) : null}
          </div>
          {draft.place ? (
            <div
              role="group"
              aria-label={t("hobbyhub.filters.radius")}
              className="flex flex-wrap gap-2 pt-1.5"
            >
              {RADIUS_OPTIONS_KM.map((km) => (
                <FilterChip
                  key={km}
                  pressed={draft.radiusKm === km}
                  onPressedChange={() => setDraft((current) => ({ ...current, radiusKm: km }))}
                >
                  {t("hobbyhub.filters.radiusOption", { km })}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

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
      {fields.includes("freeSpots") ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            pressed={draft.freeSpotsOnly}
            onPressedChange={(isPressed) =>
              setDraft((current) => ({ ...current, freeSpotsOnly: isPressed }))
            }
          >
            {t("hobbyhub.filters.freeSpots")}
          </FilterChip>
          <FilterChip
            pressed={draft.lastMinute}
            onPressedChange={(isPressed) =>
              setDraft((current) => ({ ...current, lastMinute: isPressed }))
            }
          >
            {t("hobbyhub.filters.lastMinute")}
          </FilterChip>
        </div>
      ) : null}

      {fields.includes("price") ? (
        <RangeField
          kind="price"
          label={t("hobbyhub.filters.price")}
          from={draft.priceFrom}
          to={draft.priceTo}
          step="1"
          onChange={({ from, to }) =>
            setDraft((current) => ({ ...current, priceFrom: from, priceTo: to }))
          }
        />
      ) : null}

      {fields.includes("duration") ? (
        <RangeField
          kind="duration"
          label={t("hobbyhub.filters.duration")}
          from={draft.hoursFrom}
          to={draft.hoursTo}
          step="0.5"
          onChange={({ from, to }) =>
            setDraft((current) => ({ ...current, hoursFrom: from, hoursTo: to }))
          }
        />
      ) : null}

      {fields.includes("capacity") ? (
        <RangeField
          kind="capacity"
          label={t("hobbyhub.filters.capacity")}
          from={draft.capacityFrom}
          to={draft.capacityTo}
          step="1"
          onChange={({ from, to }) =>
            setDraft((current) => ({ ...current, capacityFrom: from, capacityTo: to }))
          }
        />
      ) : null}
      {fields.includes("approval") ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 typo-small text-foreground">
            {t("hobbyhub.filters.approval")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["", "OPEN", "APPROVAL"] as const).map((mode) => (
              <FilterChip
                key={mode || "all"}
                pressed={draft.approvalMode === mode}
                onPressedChange={() => setDraft((current) => ({ ...current, approvalMode: mode }))}
              >
                {mode ? t(`groups.approval.${mode}`) : t("hobbyhub.filters.approvalAll")}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      ) : null}

      {fields.includes("upcomingEvent") ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            pressed={draft.hasUpcomingEvent}
            onPressedChange={(isPressed) =>
              setDraft((current) => ({ ...current, hasUpcomingEvent: isPressed }))
            }
          >
            {t("hobbyhub.filters.upcomingEvent")}
          </FilterChip>
        </div>
      ) : null}

      {fields.includes("groupSort") ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 typo-small text-foreground">{t("hobbyhub.filters.sort")}</legend>
          <div className="flex flex-wrap gap-2">
            {/* Nearest needs a place to measure from. */}
            {(draft.place
              ? (["newest", "members", "nearest"] as const)
              : (["newest", "members"] as const)
            ).map((sort) => (
              <FilterChip
                key={sort}
                pressed={draft.groupSort === sort}
                onPressedChange={() => setDraft((current) => ({ ...current, groupSort: sort }))}
              >
                {t(`hobbyhub.filters.sortBy.${sort}`)}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      ) : null}
      {isNumberReversed || isNumberInvalid ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {isNumberInvalid
            ? t("hobbyhub.filters.rangeInvalid", {
                capacity: RANGE_LIMITS.capacity.max,
                hours: RANGE_LIMITS.duration.max,
              })
            : t("hobbyhub.filters.rangeReversed")}
        </p>
      ) : null}
      {/* A page whose order is a field of its own passes "" and says nothing here. */}
      {sortNote === "" ? null : (
        <p className="typo-small text-muted-foreground">
          {sortNote ?? t("hobbyhub.filters.sortNote")}
        </p>
      )}
    </div>
  )
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
  const options = useActivityChoices(activityOptions)
  const [draft, setDraft] = useState(value)

  // Every opening starts from the filters that are actually applied, whether
  // the panel was opened by its trigger or by the parent.
  const [isPreviouslyOpen, setIsPreviouslyOpen] = useState(isOpen)
  if (isOpen !== isPreviouslyOpen) {
    setIsPreviouslyOpen(isOpen)
    if (isOpen) setDraft(value)
  }

  const resultLabel = countResults
    ? t("hobbyhub.filters.results", { count: countResults(draft) })
    : t("hobbyhub.filters.showResults")

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t("hobbyhub.filters.title")}
      // The panel has fields to type in; a pinned button would cover the focused one above the keyboard.
      isFooterScrolling
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
            if (filterDraftErrors(draft).hasErrors) return
            onApply(draft)
            onOpenChange(false)
          }}
        >
          {resultLabel}
        </Button>
      }
    >
      <FiltersFields
        draft={draft}
        onDraftChange={setDraft}
        fields={fields}
        options={options}
        activitiesState={activitiesState}
        sortNote={sortNote}
      />
    </ResponsiveSheet>
  )
}
