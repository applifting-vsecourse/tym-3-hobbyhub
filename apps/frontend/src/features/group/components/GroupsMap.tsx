import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { UsersIcon } from "lucide-react"
import mapboxgl from "mapbox-gl"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

import { env } from "@/config/env"
import { cn } from "@/lib/utils"

import type { Group } from "@/features/group/api/groupSchemas"

import "mapbox-gl/dist/mapbox-gl.css"

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11"
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11"
// Prague, until there is something to fit.
const FALLBACK_CENTER: [number, number] = [14.4378, 50.0755]
const FALLBACK_ZOOM = 10
const FIT_MAX_ZOOM = 13

const isDark = () => document.documentElement.classList.contains("dark")

type Located = Group & { latitude: number; longitude: number }
const isLocated = (group: Group): group is Located =>
  group.latitude !== null && group.longitude !== null

/** A pin: the person and the member count in a pill. The group has no exact spot on the map, only a dashed ring. */
function GroupPin({ group, isSelected }: { group: Located; isSelected: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: group.id }}
      aria-label={t("groups.map.pin", { name: group.name, count: group.memberCount })}
      className={cn(
        "relative flex items-center gap-1 rounded-md border-2 border-primary bg-card px-2 py-1 typo-label text-primary shadow-float outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        isSelected && "bg-primary text-primary-foreground",
      )}
    >
      <UsersIcon
        aria-hidden
        className="size-4"
      />
      {group.memberCount}
    </Link>
  )
}

type GroupsMapProps = {
  groups: Group[]
  className?: string
  /** Say so when the map cannot start; a small map in a page leaves it out. */
  isFallbackShown?: boolean
}

/**
 * Mapa skupin (ADR-0028): every group with a place as a pill with its member
 * count and a dashed ring, because a group meets around a place, not at an
 * exact spot. A group without a place is only in the list. Without a token or
 * where the map cannot start, the list beside it carries on.
 */
export function GroupsMap({ groups, className, isFallbackShown = true }: GroupsMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const [isBroken, setIsBroken] = useState(false)
  const [zoom, setZoom] = useState(FALLBACK_ZOOM)
  const located = groups.filter(isLocated)

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the failed external system
      setIsBroken(true)
      return
    }
    const observer = new MutationObserver(() =>
      created.setStyle(isDark() ? DARK_STYLE : LIGHT_STYLE),
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    setMap(created)
    created.on("zoomend", () => setZoom(created.getZoom()))
    return () => {
      observer.disconnect()
      created.remove()
      setMap(null)
    }
  }, [])

  const clusters = clusterGroups(located, zoom)

  // Fit the pins whenever the groups on the map change.
  const fitKey = located.map((group) => group.id).join(",")
  useEffect(() => {
    if (!map || located.length === 0) return
    const bounds = new mapboxgl.LngLatBounds()
    located.forEach((group) => bounds.extend([group.longitude, group.latitude]))
    map.fitBounds(bounds, { padding: 72, maxZoom: FIT_MAX_ZOOM, duration: 0 })
    // `fitKey` stands for the list of groups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])

  if (isBroken || !env.VITE_MAPBOX_TOKEN) {
    if (!isFallbackShown) return null
    return (
      <p className={cn("typo-small text-muted-foreground", className)}>
        {t("groups.map.unavailable")}
      </p>
    )
  }

  return (
    <div
      role="region"
      aria-label={t("groups.map.label")}
      className={cn("relative overflow-hidden rounded-lg border border-border", className)}
    >
      <div
        ref={containerRef}
        className="size-full min-h-80"
      />
      {map
        ? clusters.map((cluster) => (
            <GroupMarker
              key={cluster.key}
              map={map}
              latitude={cluster.latitude}
              longitude={cluster.longitude}
            >
              {cluster.single ? (
                <GroupPin
                  group={cluster.single}
                  isSelected={false}
                />
              ) : (
                <ClusterPin
                  count={cluster.groups.length}
                  onClick={() =>
                    map.easeTo({
                      center: [cluster.longitude, cluster.latitude],
                      zoom: Math.min(map.getZoom() + 2.5, 15),
                    })
                  }
                />
              )}
            </GroupMarker>
          ))
        : null}
    </div>
  )
}

type Cluster = {
  key: string
  latitude: number
  longitude: number
  groups: Located[]
  /** Set when the cluster is just one group. */
  single: Located | null
}

// Pins closer than about 56 px on screen become one; zoomed in they fall apart.
function clusterGroups(groups: Located[], zoom: number): Cluster[] {
  const cell = (56 * 360) / (256 * 2 ** zoom)
  const cells = new Map<string, Located[]>()
  for (const group of groups) {
    const key = `${Math.round(group.latitude / cell)}:${Math.round(group.longitude / cell)}`
    cells.set(key, [...(cells.get(key) ?? []), group])
  }
  return [...cells].map(([key, inCell]) => ({
    key: inCell.length === 1 ? (inCell[0]?.id ?? key) : key,
    single: inCell.length === 1 ? (inCell[0] ?? null) : null,
    latitude: inCell.reduce((sum, group) => sum + group.latitude, 0) / inCell.length,
    longitude: inCell.reduce((sum, group) => sum + group.longitude, 0) / inCell.length,
    groups: inCell,
  }))
}

/** Several groups in one place: how many, and a click zooms in on them. */
function ClusterPin({ count, onClick }: { count: number; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-label={t("groups.map.cluster", { count })}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border-2 border-primary bg-card typo-label text-primary shadow-float outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {count}
    </button>
  )
}

function GroupMarker({
  map,
  latitude,
  longitude,
  children,
}: {
  map: mapboxgl.Map
  latitude: number
  longitude: number
  children: ReactNode
}) {
  const [element] = useState(() => document.createElement("div"))
  useEffect(() => {
    const marker = new mapboxgl.Marker({ element, anchor: "center" })
      .setLngLat([longitude, latitude])
      .addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, element, latitude, longitude])
  return createPortal(children, element)
}
