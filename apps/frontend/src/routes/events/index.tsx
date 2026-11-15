import { lazy, Suspense, useEffect, useState } from "react"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { LocateFixed } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AppShell } from "@/app/AppShell"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import type { FiltersSheetField } from "@/components/hobbyhub/FiltersSheet"
import { Loader } from "@/components/hobbyhub/Loader"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { activityName } from "@/features/activity/activityName"
import { useActivityOptions } from "@/features/activity/hooks/useActivityOptions"
import { eventsMapQueryOptions, eventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import { EventList } from "@/features/event/components/EventList"
import { SelectedEventCard } from "@/features/event/components/SelectedEventCard"
import { useNearMe } from "@/features/event/hooks/useNearMe"
import { useSearchText } from "@/features/event/hooks/useSearchText"
import { eventsInBounds, type MapBounds } from "@/features/event/lib/clusterEvents"
import {
  eventsListSearchSchema,
  filtersFromSearch,
  hasFilters,
  nonEmpty,
  searchWithFilters,
} from "@/features/event/lib/eventsSearch"

// Where the page scrolls to when an event is opened on the map.
const SELECTED_CARD_ID = "selected-event"

// Mapbox is large; the list does not wait for it.
const EventsMap = lazy(() =>
  import("@/features/event/components/EventsMap").then((module) => ({ default: module.EventsMap })),
)

// The public list offers the ranges of #214 on top of what "Moje akce" has.
const EVENT_LIST_FILTER_FIELDS: FiltersSheetField[] = [
  "activity",
  "when",
  "location",
  "freeSpots",
  "price",
  "duration",
  "capacity",
]

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  validateSearch: eventsListSearchSchema,
})

// TODO(F-02.1b #91): `location` and `q` are plain text matches. Similar
// spellings and "within X km of a place" need every event to have coordinates
// (geocoding, F-12.3) and a place to measure from; for now only the visitor's
// own position sorts the list.

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
  const navigate = Route.useNavigate()
  const { filters, isRangeReversed } = filtersFromSearch(Route.useSearch())
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
  const eventsOnMap = eventsInBounds(mapEvents, mapBounds)
  const selectedEvent = mapEvents.find((event) => event.id === selectedId) ?? null
  const showWholeMap = () => {
    setMapBounds(null)
    setMapFitKey((key) => key + 1)
  }
  // The field is what the user typed; the address follows after a pause.
  const activityOptions = useActivityOptions()
  const [searchText, setSearchText] = useSearchText(
    filters.search,
    (next) =>
      void navigate({
        search: (previous) => ({ ...previous, q: nonEmpty(next) }),
        replace: true,
      }),
  )
  const clearFilters = () => {
    showWholeMap()
    setSearchText("")
    void navigate({ search: {} })
  }

  return (
    <>
      <Seo title={t("events.list.seoTitle")} />
      {/* The page is exactly one screen wherever a map is shown, so dragging the map never
          scrolls the page: beside the map (from `lg`) the list scrolls on its own, and on a
          phone the map view fills what is left below the filters. The shell is as tall as the
          screen and the page takes what the header and the navigation leave. */}
      <AppShell
        shellClassName={cn("lg:h-svh", view === "map" && "max-lg:h-dvh")}
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:min-h-0 lg:overflow-hidden lg:px-8 lg:py-6",
          view === "map" && "max-lg:min-h-0 max-lg:overflow-hidden max-lg:py-4",
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
            <EventFiltersBar
              filters={filters}
              isRangeReversed={isRangeReversed}
              searchText={searchText}
              onSearchTextChange={setSearchText}
              activityOptions={activityOptions.options}
              activitiesState={activityOptions.state}
              fields={EVENT_LIST_FILTER_FIELDS}
              onFiltersChange={(next) =>
                void navigate({ search: (previous) => searchWithFilters(previous, next) })
              }
              leadingChips={
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
              }
            >
              {nearMe.status === "denied" || nearMe.status === "unavailable" ? (
                <p
                  role="status"
                  className="typo-small text-muted-foreground"
                >
                  {t(`events.list.nearMe.${nearMe.status}`)}
                </p>
              ) : null}
            </EventFiltersBar>
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
                isFiltered={hasFilters(filters) || eventsOnMap !== null}
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
                error={mapQuery.error}
                onRetry={() => void mapQuery.refetch()}
              />
            </Suspense>
          </div>
        </div>
      </AppShell>
    </>
  )
}
