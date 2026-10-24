import { useEffect, useMemo, useRef, useState } from "react"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { MapPin, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { EMPTY_FILTERS, FiltersSheet } from "@/components/hobbyhub/FiltersSheet"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Seo } from "@/components/Seo"
import { cn } from "@/lib/utils"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { AppShell } from "@/features/auth/components/AppShell"
import { eventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { EventList } from "@/features/event/components/EventList"
import { EventsMapPlaceholder } from "@/features/event/components/EventsMapPlaceholder"
import {
  EVENT_SEARCH_MAX_LENGTH,
  eventsSearchSchema,
  nonEmpty,
} from "@/features/event/lib/eventsSearch"

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
})

// TODO(F-02.1b #91): `location` and `q` are plain text matches. Similar
// spellings, distance from a place and sorting by it need coordinates
// (geocoding, F-12.3) and a backend that understands them.

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
  const filters = { activityIds, search: q ?? "", location: location ?? "" }
  // The previous list stays on screen while the next one loads, so typing does not flash.
  const eventsQuery = useInfiniteQuery({
    ...eventsQueryOptions(filters),
    placeholderData: keepPreviousData,
  })
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const activities = activitiesQuery.data ?? []
  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((item) => ({
        id: item.id,
        label: activityName(t, item),
        icon: item.icon,
      })),
    [activitiesQuery.data, t],
  )

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
      <AppShell className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8">
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
            activityOptions={activityOptions}
          />
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
        <ViewToggle
          value={view}
          onValueChange={setView}
          className="w-full lg:hidden"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-8">
          <div
            aria-busy={eventsQuery.isPlaceholderData}
            className={cn(
              view === "list" ? undefined : "max-lg:hidden",
              // The previous list stays until the new one arrives; show that it is stale.
              eventsQuery.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            <EventList
              events={uniqueById(eventsQuery.data?.pages.flatMap((page) => page.items) ?? [])}
              total={eventsQuery.data?.pages[0]?.total ?? 0}
              activityLabel={(item) => activityName(t, item)}
              isLoading={eventsQuery.isPending}
              error={eventsQuery.error}
              onReload={() => void eventsQuery.refetch()}
              hasMore={eventsQuery.hasNextPage && !eventsQuery.isPlaceholderData}
              isLoadingMore={eventsQuery.isFetchingNextPage}
              onLoadMore={() => void eventsQuery.fetchNextPage()}
              isFiltered={isFiltered}
              onClearFilters={clearFilters}
            />
          </div>
          <div className={view === "map" ? undefined : "max-lg:hidden"}>
            <EventsMapPlaceholder />
          </div>
        </div>
      </AppShell>
    </>
  )
}
