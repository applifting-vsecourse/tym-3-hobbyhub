import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import mapboxgl from "mapbox-gl"
import { useTranslation } from "react-i18next"

import { GroupClusterPin, GroupPin } from "@/components/hobbyhub/GroupPin"
import { DARK_STYLE, isDark, LIGHT_STYLE, MapMarker } from "@/components/hobbyhub/mapShared"
import { env } from "@/config/env"
import { cn } from "@/lib/utils"

import type { Group } from "@/features/group/api/groupSchemas"
import { clusterGroups, type LocatedGroup } from "@/features/group/lib/clusterGroups"

import "mapbox-gl/dist/mapbox-gl.css"

// Prague, until there is something to fit.
const FALLBACK_CENTER: [number, number] = [14.4378, 50.0755]
const FALLBACK_ZOOM = 10
const FIT_MAX_ZOOM = 13

const isLocated = (group: Group): group is LocatedGroup =>
  group.latitude !== null && group.longitude !== null

/** A group's pin opens the group. */
function GroupPinLink({ group }: { group: LocatedGroup }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: group.id }}
      aria-label={t("groups.map.pin", { name: group.name, count: group.memberCount })}
      className="block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <GroupPin count={group.memberCount} />
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
 * count, several in one spot as one count that zooms in. A group meets around a
 * place, so the pin has no ring or exact point. A group without a place is only
 * in the list. Without a token or
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
            <MapMarker
              key={cluster.key}
              map={map}
              latitude={cluster.latitude}
              longitude={cluster.longitude}
              anchor="center"
            >
              {cluster.single ? (
                <GroupPinLink group={cluster.single} />
              ) : (
                <button
                  type="button"
                  aria-label={t("groups.map.cluster", { count: cluster.groups.length })}
                  className="block rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  onClick={() =>
                    map.easeTo({
                      center: [cluster.longitude, cluster.latitude],
                      zoom: Math.min(map.getZoom() + 2.5, 15),
                    })
                  }
                >
                  <GroupClusterPin count={cluster.groups.length} />
                </button>
              )}
            </MapMarker>
          ))
        : null}
    </div>
  )
}
