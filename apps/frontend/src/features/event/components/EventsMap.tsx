import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import mapboxgl from "mapbox-gl"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

import { missingCount } from "@/components/hobbyhub/capacity"
import { EventClusterPin, EventPin } from "@/components/hobbyhub/EventPin"
import { env } from "@/config/env"

import type { NearPoint } from "@/features/event/api/eventKeys"
import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { SelectedEventCard } from "@/features/event/components/SelectedEventCard"
import {
  clusterEvents,
  worldPixel,
  type CellSize,
  type EventGroup,
  type MapBounds,
} from "@/features/event/lib/clusterEvents"

import "mapbox-gl/dist/mapbox-gl.css"

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11"
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11"

// Prague, until there is something to fit.
const FALLBACK_CENTER: [number, number] = [14.4378, 50.0755]
const FALLBACK_ZOOM = 10
// Pins closer than this on screen become one cluster. Zoomed out they are small
// icons side by side; from `COMPACT_BELOW_ZOOM` on they are wide pills with the name.
const COMPACT_BELOW_ZOOM = 13
const COMPACT_CELL: CellSize = { width: 48, height: 44 }
const PILL_CELL: CellSize = { width: 150, height: 44 }
const FIT_PADDING = 72
// Pins are wide, so the sides keep more room; a narrow map keeps a quarter at most.
const FIT_SIDE_PADDING = 120
const FIT_MAX_ZOOM = 14
const NEAR_ME_ZOOM = 12
// From here on events that would cluster are laid side by side as icons you can
// click one by one: a cluster that cannot split any further is no use.
const SPREAD_ZOOM = 15.5
const SPREAD_STEP_PX = 44

type LocatedEvent = EventListItem & { latitude: number; longitude: number }
type LocatedGroup = EventGroup<LocatedEvent>

const isLocated = (event: EventListItem): event is LocatedEvent =>
  event.latitude !== null && event.longitude !== null

/** The one event of a group that is not a cluster. */
const soleEvent = (group: LocatedGroup) => (group.events.length === 1 ? group.events[0] : undefined)

const fitPadding = (target: mapboxgl.Map) => {
  const side = Math.min(FIT_SIDE_PADDING, target.getContainer().clientWidth / 4)
  return { top: FIT_PADDING, bottom: FIT_PADDING, left: side, right: side }
}

const isDark = () => document.documentElement.classList.contains("dark")

type MapMarkerProps = {
  map: mapboxgl.Map
  latitude: number
  longitude: number
  anchor: "bottom" | "center"
  /** Pixels to shift the marker sideways from its position, to lay pins on one spot side by side. */
  offsetX?: number
  children: ReactNode
}

/** Puts React content on the map: a Mapbox marker whose element React draws into. */
function MapMarker({ map, latitude, longitude, anchor, offsetX = 0, children }: MapMarkerProps) {
  const [element] = useState(() => document.createElement("div"))
  useEffect(() => {
    const marker = new mapboxgl.Marker({ element, anchor, offset: [offsetX, 0] })
      .setLngLat([longitude, latitude])
      .addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, element, anchor, offsetX, latitude, longitude])
  return createPortal(children, element)
}

type MapPinData = {
  key: string
  latitude: number
  longitude: number
  /** Set for a pin of one event; a cluster has only its group. */
  event?: LocatedEvent
  group: LocatedGroup
  isCompact: boolean
  offsetX: number
}

type EventsMapProps = {
  events: EventListItem[]
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  /** Where the visitor is, when they asked for the nearest events. */
  userPosition: NearPoint | null
  isLoading?: boolean
  /** Why the events could not be loaded; shown instead of "no events", with a way to retry. */
  error?: Error | null
  onRetry?: () => void
  /**
   * The part of the map the visitor has moved or zoomed to, so the list can show
   * the same events; null while the map shows everything (after a fit).
   */
  onBoundsChange: (bounds: MapBounds | null) => void
  /** Changes when the visitor asks to see all events again. */
  fitKey: number
  /** The open event: the pin is highlighted and its card shown. Owned by the page, so the list can follow it. */
  selectedId: string | null
  onSelect: (id: string | null) => void
}

// Moves the map makes itself carry this, to tell them from the visitor's.
const AUTO = { auto: true }
// A move the visitor asked for through a control of ours (a cluster), which has no
// DOM event of its own the way a drag, the wheel or the zoom buttons do.
const ASKED = { asked: true }

/**
 * Mapbox map of the events with a position: one pin per event (the number is
 * how many people are missing), clusters where pins would overlap, and a
 * preview of the selected event. Pins are the design's `MapPin`.
 */
export function EventsMap({
  events,
  activityLabel,
  userPosition,
  isLoading,
  error,
  onRetry,
  onBoundsChange,
  fitKey,
  selectedId,
  onSelect,
}: EventsMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const [zoom, setZoom] = useState(FALLBACK_ZOOM)
  // No WebGL, or Mapbox refused the token: the map cannot be drawn.
  const [isBroken, setIsBroken] = useState(false)
  // The map's own handlers are set up once and must call the latest callbacks.
  const onBoundsChangeRef = useRef(onBoundsChange)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
    onSelectRef.current = onSelect
  })

  const located = useMemo(() => events.filter(isLocated), [events])
  // A selected event that a filter has since removed is simply no longer selected.
  const selected = located.find((event) => event.id === selectedId) ?? null
  const isCompact = zoom < COMPACT_BELOW_ZOOM
  // What is drawn: a pin per event, a cluster per group that is still close enough
  // to overlap, or, once zoomed in all the way, the events of a cluster side by side.
  const isSpread = zoom >= SPREAD_ZOOM
  // The selected pin stands alone, as a wide pill; but in a row of spread icons it
  // keeps its place there (highlighted) so the others stay visible beside it.
  const standAlone = isSpread ? null : (selected?.id ?? null)
  const groups = useMemo(
    () =>
      clusterEvents(
        located,
        (point) => worldPixel(point, zoom),
        isCompact ? COMPACT_CELL : PILL_CELL,
        standAlone,
      ),
    [located, zoom, isCompact, standAlone],
  )
  const pins = useMemo(
    () =>
      groups.flatMap((group): MapPinData[] => {
        const only = soleEvent(group)
        if (only) {
          const isSelected = only.id === selected?.id
          return [
            {
              key: `${group.key}:${isSelected ? "selected" : "pin"}`,
              latitude: group.latitude,
              longitude: group.longitude,
              event: only,
              group,
              isCompact: isCompact && !isSelected,
              offsetX: 0,
            },
          ]
        }
        if (!isSpread) {
          return [
            {
              key: group.key,
              latitude: group.latitude,
              longitude: group.longitude,
              group,
              isCompact: false,
              offsetX: 0,
            },
          ]
        }
        return group.events.map((event, index) => ({
          key: `${event.id}:spread`,
          latitude: group.latitude,
          longitude: group.longitude,
          event,
          group,
          isCompact: true,
          offsetX: (index - (group.events.length - 1) / 2) * SPREAD_STEP_PX,
        }))
      }),
    [groups, isCompact, isSpread, selected?.id],
  )

  // The map itself: created once, removed with the component.
  useEffect(() => {
    const token = env.VITE_MAPBOX_TOKEN
    const container = containerRef.current
    if (!token || !container) return
    mapboxgl.accessToken = token
    let created: mapboxgl.Map
    try {
      created = new mapboxgl.Map({
        container,
        style: isDark() ? DARK_STYLE : LIGHT_STYLE,
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
        attributionControl: false,
      })
    } catch {
      // Throws "Failed to initialize WebGL" where it is switched off or unsupported;
      // the list beside the map must carry on.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the failed external system
      setIsBroken(true)
      return
    }
    let isLoaded = false
    // An error before the style is there means the map will stay grey (a bad token,
    // no network); later ones are single tiles failing, which the map shrugs off.
    created.on("error", () => {
      if (!isLoaded) setIsBroken(true)
    })
    created.addControl(new mapboxgl.AttributionControl({ compact: true }))
    created.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    created.on("load", () => {
      isLoaded = true
      setZoom(created.getZoom())
      setMap(created)
    })
    created.on("zoomend", () => setZoom(created.getZoom()))
    created.on("moveend", (event) => {
      const moved = event as { auto?: boolean; asked?: boolean }
      if (moved.auto) return onBoundsChangeRef.current(null)
      // Only the visitor's own gesture narrows the list. Mapbox also ends a move
      // when the container is resized (the map appears on a phone, the window
      // changes), and that must not turn into a filter.
      if (!event.originalEvent && !moved.asked) return
      const bounds = created.getBounds()
      if (!bounds) return
      onBoundsChangeRef.current({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      })
    })
    // Only a click on the bare map deselects; markers sit in the same container.
    created.on("click", (event) => {
      if (event.originalEvent.target instanceof HTMLCanvasElement) onSelectRef.current(null)
    })

    // Follow the theme switcher, which flips `.dark` on the root.
    const observer = new MutationObserver(() =>
      created.setStyle(isDark() ? DARK_STYLE : LIGHT_STYLE),
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    // The map starts hidden on phones (the list is shown first); redraw it at
    // its real size once it appears or the window changes.
    const resizeObserver = new ResizeObserver(() => created.resize())
    resizeObserver.observe(container)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      created.remove()
      setMap(null)
    }
  }, [])

  // New events (a filter changed): fit them. On the visitor ("nearest first") the
  // map stays put, but the list stops following the old area. "Show all" always
  // fits, wherever the map is.
  const signature = located.map((event) => event.id).join(",")
  const hasUserPosition = userPosition !== null
  const lastFitKey = useRef(fitKey)
  useEffect(() => {
    const isAskedFor = lastFitKey.current !== fitKey
    lastFitKey.current = fitKey
    if (!map) return
    if (hasUserPosition && !isAskedFor) return onBoundsChangeRef.current(null)
    if (located.length === 0) return onBoundsChangeRef.current(null)
    const bounds = new mapboxgl.LngLatBounds()
    for (const event of located) bounds.extend([event.longitude, event.latitude])
    map.fitBounds(bounds, { padding: fitPadding(map), maxZoom: FIT_MAX_ZOOM, duration: 0 }, AUTO)
    // `signature` stands for `located`: refit when the events change (or the
    // visitor asks to see them all), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature, hasUserPosition, fitKey])

  // "Nearest first": centre on the visitor.
  useEffect(() => {
    if (!map || !userPosition) return
    map.easeTo(
      { center: [userPosition.longitude, userPosition.latitude], zoom: NEAR_ME_ZOOM },
      AUTO,
    )
  }, [map, userPosition])

  // Zooming splits a cluster; when its events share one spot the map reaches
  // `SPREAD_ZOOM` and they are laid side by side instead.
  const zoomInto = (group: LocatedGroup) => {
    if (!map) return
    const bounds = new mapboxgl.LngLatBounds()
    for (const event of group.events) bounds.extend([event.longitude, event.latitude])
    map.fitBounds(bounds, { padding: fitPadding(map), maxZoom: FIT_MAX_ZOOM + 2 }, ASKED)
  }

  return (
    <div className="relative h-full min-h-72 overflow-hidden rounded-xl bg-muted">
      {env.VITE_MAPBOX_TOKEN && !isBroken ? (
        // Mapbox's stylesheet makes its container `position: relative`, so the
        // filling is done by this wrapper, not by the container.
        <div className="absolute inset-0">
          <div
            ref={containerRef}
            className="size-full"
            role="region"
            aria-label={t("events.map.label")}
          />
        </div>
      ) : (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center p-6 text-center typo-body text-muted-foreground"
        >
          {t("events.map.unavailable")}
        </p>
      )}
      {map
        ? pins.map((pin) => {
            const { event } = pin
            const missing = event
              ? missingCount({ taken: event.takenCount, min: event.minParticipants })
              : 0
            return (
              <MapMarker
                key={pin.key}
                map={map}
                latitude={pin.latitude}
                longitude={pin.longitude}
                anchor="center"
                offsetX={pin.offsetX}
              >
                <button
                  type="button"
                  aria-label={
                    event
                      ? t(missing > 0 ? "events.map.pinMissing" : "events.map.pinFull", {
                          title: event.title,
                          count: missing,
                        })
                      : t("events.map.cluster", { count: pin.group.events.length })
                  }
                  className="cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => (event ? onSelect(event.id) : zoomInto(pin.group))}
                >
                  {event ? (
                    <EventPin
                      activity={event.activity.icon}
                      title={event.title}
                      missingLabel={
                        missing > 0 ? t("events.map.missing", { count: missing }) : undefined
                      }
                      state={
                        event.id === selected?.id ? "selected" : missing > 0 ? "missing" : "full"
                      }
                      isCompact={pin.isCompact}
                    />
                  ) : (
                    <EventClusterPin
                      label={t("events.map.cluster", { count: pin.group.events.length })}
                    />
                  )}
                </button>
              </MapMarker>
            )
          })
        : null}
      {map && userPosition ? (
        <MapMarker
          map={map}
          latitude={userPosition.latitude}
          longitude={userPosition.longitude}
          anchor="center"
        >
          <span
            role="img"
            aria-label={t("events.map.you")}
            className="block size-4 rounded-full border-2 border-background bg-foreground ring-4 ring-foreground/20"
          />
        </MapMarker>
      ) : null}
      {error ? (
        <div className="absolute inset-x-3 top-3 shadow-float">
          <EventsLoadError
            error={error}
            onRetry={onRetry}
          />
        </div>
      ) : null}
      {map && !isLoading && !error && located.length === 0 ? (
        <p
          role="status"
          className="absolute inset-x-3 top-3 rounded-lg border border-border bg-popover p-3 text-center typo-small text-popover-foreground shadow-float"
        >
          {t("events.map.empty")}
        </p>
      ) : null}
      {selected ? (
        // On a phone the list is hidden, so the card floats over the map; beside
        // the list (from `lg`) it sits at the top of the list instead.
        <SelectedEventCard
          event={selected}
          activityLabel={activityLabel(selected.activity)}
          onClose={() => onSelect(null)}
          className="absolute inset-x-3 bottom-3 drop-shadow-float lg:hidden"
        />
      ) : null}
    </div>
  )
}
