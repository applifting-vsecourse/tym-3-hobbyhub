import { useEffect, useRef, useState } from "react"
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
    return () => {
      observer.disconnect()
      created.remove()
      setMap(null)
    }
  }, [])

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
        ? located.map((group) => (
            <GroupMarker
              key={group.id}
              map={map}
              group={group}
            />
          ))
        : null}
    </div>
  )
}

function GroupMarker({ map, group }: { map: mapboxgl.Map; group: Located }) {
  const [element] = useState(() => document.createElement("div"))
  useEffect(() => {
    const marker = new mapboxgl.Marker({ element, anchor: "center" })
      .setLngLat([group.longitude, group.latitude])
      .addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, element, group.latitude, group.longitude])
  return createPortal(
    <GroupPin
      group={group}
      isSelected={false}
    />,
    element,
  )
}
