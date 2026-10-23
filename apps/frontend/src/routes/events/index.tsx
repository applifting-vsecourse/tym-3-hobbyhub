import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LocateFixed, MapPin, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { EMPTY_FILTERS, FiltersSheet } from "@/components/hobbyhub/FiltersSheet"
import { Loader } from "@/components/hobbyhub/Loader"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { AppShell } from "@/features/auth/components/AppShell"
import { eventsMapQueryOptions, eventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { EventList } from "@/features/event/components/EventList"
import { SelectedEventCard } from "@/features/event/components/SelectedEventCard"
import { useNearMe } from "@/features/event/hooks/useNearMe"
import { isInBounds, type MapBounds } from "@/features/event/lib/clusterEvents"
import {
  EVENT_SEARCH_MAX_LENGTH,
  eventsSearchSchema,
  nonEmpty,
} from "@/features/event/lib/eventsSearch"

// Where the page scrolls to when an event is opened on the map.
const SELECTED_CARD_ID = "selected-event"

// Mapbox is large; the list does not wait for it.
const EventsMap = lazy(() =>
  import("@/features/event/components/EventsMap").then((module) => ({ default: module.EventsMap })),
)

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
})

// TODO(F-02.1b #91): `location` and `q` are plain text matches. Similar
// spellings and "within X km of a place" need every event to have coordinates
// (geocoding, F-12.3) and a place to measure from; for now only the visitor's
// own position sorts the list.

// Typing waits this long before it filters, so a word is not searched letter by letter.
const SEARCH_DEBOUNCE_MS = 300

// Pages are cut by offset, so an event that moved between two requests can come
// back on the next page; keep its first appearance.
const uniqueById = <T extends { id: string }>(items: T[]): T[] => [
  ...new Map(items.map((item) => [item.id, item])).values(),
]

// Public: browsing events needs no account. On phones one view at a time, from
// `lg` the list and the map sit side by side.
function EventsPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<EventsView>("list")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const navigate = Route.useNavigate()
  const { activity, q, location } = Route.useSearch()
  const activityIds = activity ?? []
  const nearMe = useNearMe()
  // The part of the map the visitor moved to; the list then shows only its events.
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapFitKey, setMapFitKey] = useState(0)
  // The event open on the map: its card is at the top of the list and its row is highlighted.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (!selectedId) return
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document
      .getElementById(SELECTED_CARD_ID)
      ?.scrollIntoView({ block: "start", behavior: isReduced ? "auto" : "smooth" })
  }, [selectedId])
  const filters = { activityIds, search: q ?? "", location: location ?? "" }
  // The previous list stays on screen while the next one loads, so typing does not flash.
  const eventsQuery = useInfiniteQuery({
    ...eventsQueryOptions({ ...filters, near: nearMe.position ?? undefined }),
    placeholderData: keepPreviousData,
  })
  // The map shows every event of the filter, not the page of the list.
  const mapQuery = useQuery({
    ...eventsMapQueryOptions({ ...filters, near: nearMe.position ?? undefined }),
    placeholderData: keepPreviousData,
  })
  const mapEvents = mapQuery.data ?? []
  // Once the map is moved the list is what is on screen; the map query holds every event.
  const eventsOnMap = mapBounds ? mapEvents.filter((event) => isInBounds(event, mapBounds)) : null
  const selectedEvent = mapEvents.find((event) => event.id === selectedId) ?? null
  const showWholeMap = () => {
    setMapBounds(null)
    setMapFitKey((key) => key + 1)
  }
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const activities = activitiesQuery.data ?? []

  // The field is what the user typed; the address follows after a pause. The
  // last text this page put in the address is remembered, so the address
  // catching up never overwrites what was typed in the meantime.
  const [searchText, setSearchText] = useState(filters.search)
  const lastSentSearch = useRef(filters.search)
  useEffect(() => {
    // The address changed on its own (back button, a link): show it in the field.
    if (filters.search === lastSentSearch.current) return
    lastSentSearch.current = filters.search
    setSearchText(filters.search)
  }, [filters.search])
  useEffect(() => {
    const next = searchText.trim()
    if (next === filters.search) return
    const timer = setTimeout(() => {
      lastSentSearch.current = next
      void navigate({
        search: (previous) => ({ ...previous, q: nonEmpty(next) }),
        replace: true,
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchText, filters.search, navigate])

  const setFilters = (next: { activityIds?: string[]; location?: string }) =>
    void navigate({
      search: (previous) => ({
        ...previous,
        ...(next.activityIds && {
          activity: next.activityIds.length > 0 ? next.activityIds : undefined,
        }),
        ...(next.location !== undefined && { location: nonEmpty(next.location) }),
      }),
    })
  const clearFilters = () => {
    showWholeMap()
    setSearchText("")
    void navigate({ search: {} })
  }
  // An id from the address that is no activity (retired, mistyped) still gets a
  // chip, so the filter can always be seen and removed.
  // They do not wait for the activities request: a failed one must not hide an active filter.
  const selectedActivities = activityIds.map((id) => ({
    id,
    activity: activities.find((item) => item.id === id),
  }))
  const isFiltered = activityIds.length > 0 || filters.search !== "" || filters.location !== ""

  return (
    <>
      <Seo title={t("events.list.seoTitle")} />
      {/* The page is exactly one screen wherever a map is shown, so dragging the map never
          scrolls the page: beside the map (from `lg`) the list scrolls on its own, and on a
          phone the map view fills what is left below the filters. */}
      <AppShell
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:h-[calc(100svh-4.0625rem)] lg:flex-none lg:px-8 lg:py-6",
          view === "map" &&
            "max-lg:h-[calc(100dvh-4.0625rem-var(--bottom-nav-height,0px))] max-lg:flex-none max-lg:overflow-hidden max-lg:py-4",
        )}
      >
        <div
          className={cn(
            "grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-8",
            view === "map" && "max-lg:min-h-0 max-lg:flex-1 max-lg:grid-rows-[auto_minmax(0,1fr)]",
          )}
        >
          <div className="flex flex-col gap-6 lg:min-h-0 lg:gap-4">
            <h1 className="typo-h1 text-foreground">{t("events.list.title")}</h1>
            <div className="flex flex-col gap-3">
              <SearchField
                label={t("hobbyhub.search.label")}
                placeholder={t("events.list.searchPlaceholder")}
                maxLength={EVENT_SEARCH_MAX_LENGTH}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onOpenFilters={() => setIsFiltersOpen(true)}
              />
              <FiltersSheet
                isOpen={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                value={{ ...EMPTY_FILTERS, activities: activityIds, location: filters.location }}
                onApply={(applied) =>
                  setFilters({ activityIds: applied.activities, location: applied.location })
                }
                fields={["activity", "location"]}
                activitiesState={{
                  isLoading: activitiesQuery.isPending,
                  error: activitiesQuery.error,
                  onRetry: () => void activitiesQuery.refetch(),
                }}
                activityOptions={activities.map((item) => ({
                  value: item.id,
                  label: activityName(t, item),
                }))}
              />
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  pressed={nearMe.position !== null || nearMe.status === "locating"}
                  disabled={nearMe.status === "locating"}
                  onPressedChange={(isPressed) => (isPressed ? nearMe.request() : nearMe.clear())}
                >
                  <LocateFixed
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  {t("events.list.nearMe.label")}
                </FilterChip>
                {selectedActivities.length > 0 || filters.location ? (
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
                          setFilters({ activityIds: activityIds.filter((id) => id !== item.id) })
                        }
                      >
                        {item.activity
                          ? activityName(t, item.activity)
                          : t("events.list.filters.unknownActivity")}
                        <X
                          aria-hidden
                          className="size-4 text-muted-foreground"
                        />
                      </FilterChip>
                    ))}
                    {filters.location ? (
                      <FilterChip
                        pressed
                        onPressedChange={() => setFilters({ location: "" })}
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
                  </div>
                ) : null}
              </div>
              {nearMe.status === "denied" || nearMe.status === "unavailable" ? (
                <p
                  role="status"
                  className="typo-small text-muted-foreground"
                >
                  {t(`events.list.nearMe.${nearMe.status}`)}
                </p>
              ) : null}
            </div>
            <ViewToggle
              value={view}
              onValueChange={setView}
              className="w-full lg:hidden"
            />
            <div
              aria-busy={eventsQuery.isPlaceholderData}
              className={cn(
                // Room for the rows' hover surface, which reaches past the column.
                "lg:-mx-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3",
                view === "list" ? undefined : "max-lg:hidden",
                // The previous list stays until the new one arrives; show that it is stale.
                eventsQuery.isPlaceholderData && "opacity-60 transition-opacity",
              )}
            >
              {selectedEvent ? (
                // Beside the map the card is the first thing in the list; on a
                // phone it floats over the map instead.
                <SelectedEventCard
                  event={selectedEvent}
                  activityLabel={activityName(t, selectedEvent.activity)}
                  onClose={() => setSelectedId(null)}
                  className="mb-6 hidden scroll-mt-20 lg:block"
                  id={SELECTED_CARD_ID}
                />
              ) : null}
              {eventsOnMap ? (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="typo-small text-muted-foreground">{t("events.list.inMapArea")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showWholeMap}
                  >
                    {t("events.list.showAll")}
                  </Button>
                </div>
              ) : null}
              <EventList
                events={
                  eventsOnMap ??
                  uniqueById(eventsQuery.data?.pages.flatMap((page) => page.items) ?? [])
                }
                total={eventsOnMap ? eventsOnMap.length : (eventsQuery.data?.pages[0]?.total ?? 0)}
                activityLabel={(item) => activityName(t, item)}
                isLoading={eventsQuery.isPending}
                error={eventsQuery.error}
                onReload={() => void eventsQuery.refetch()}
                hasMore={!eventsOnMap && eventsQuery.hasNextPage && !eventsQuery.isPlaceholderData}
                isLoadingMore={eventsQuery.isFetchingNextPage}
                onLoadMore={() => void eventsQuery.fetchNextPage()}
                isFiltered={isFiltered || eventsOnMap !== null}
                selectedId={selectedId}
                onClearFilters={clearFilters}
              />
            </div>
          </div>
          <div className={view === "map" ? "min-h-0" : "max-lg:hidden lg:min-h-0"}>
            <Suspense
              fallback={
                <div className="flex h-full min-h-72 items-center justify-center rounded-xl bg-muted">
                  <Loader
                    variant="player"
                    label={t("events.map.loading")}
                  />
                </div>
              }
            >
              <EventsMap
                events={mapEvents}
                onBoundsChange={setMapBounds}
                fitKey={mapFitKey}
                selectedId={selectedId}
                onSelect={setSelectedId}
                activityLabel={(item) => activityName(t, item)}
                userPosition={nearMe.position}
                isLoading={mapQuery.isPending}
              />
            </Suspense>
          </div>
        </div>
      </AppShell>
    </>
  )
}
