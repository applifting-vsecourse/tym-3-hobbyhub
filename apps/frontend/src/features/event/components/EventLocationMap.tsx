import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import { useTranslation } from "react-i18next"

import { EventPin, type EventPinState } from "@/components/hobbyhub/EventPin"
import { env } from "@/config/env"
import { cn } from "@/lib/utils"

import { DARK_STYLE, isDark, LIGHT_STYLE, MapMarker } from "@/features/event/components/mapShared"

import "mapbox-gl/dist/mapbox-gl.css"

const ZOOM = 15

type EventLocationMapProps = {
  latitude: number
  longitude: number
  /** Key of the activity icon on the pin. */
  activity: string
  title: string
  state: EventPinState
  className?: string
}

/**
 * One event on a small map that does not move: the same pin as on the big map,
 * so the place is recognised at a glance. Without a Mapbox token, or where the
 * map cannot be drawn, it shows nothing and the address beside it carries on.
 */
export function EventLocationMap({
  latitude,
  longitude,
  activity,
  title,
  state,
  className,
}: EventLocationMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const [isBroken, setIsBroken] = useState(false)
  const token = env.VITE_MAPBOX_TOKEN

  useEffect(() => {
    const container = containerRef.current
    if (!token || !container) return
    mapboxgl.accessToken = token
    let created: mapboxgl.Map
    try {
      created = new mapboxgl.Map({
        container,
        style: isDark() ? DARK_STYLE : LIGHT_STYLE,
        center: [longitude, latitude],
        zoom: ZOOM,
        interactive: false,
        attributionControl: false,
      })
    } catch {
      // No WebGL: the address and the navigation link are enough.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the failed external system
      setIsBroken(true)
      return
    }
    let isLoaded = false
    created.on("error", () => {
      if (!isLoaded) setIsBroken(true)
    })
    created.addControl(new mapboxgl.AttributionControl({ compact: true }))
    created.on("load", () => {
      isLoaded = true
      setMap(created)
    })
    // Follow the theme switcher, which flips `.dark` on the root.
    const observer = new MutationObserver(() =>
      created.setStyle(isDark() ? DARK_STYLE : LIGHT_STYLE),
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => {
      observer.disconnect()
      created.remove()
      setMap(null)
    }
  }, [token, latitude, longitude])

  if (!token || isBroken) return null

  return (
    <div className={cn("relative h-48 overflow-hidden rounded-lg bg-muted md:h-60", className)}>
      {/* Mapbox's stylesheet makes its container `position: relative`, so the
          filling is done by this wrapper, not by the container. */}
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className="size-full"
          role="region"
          aria-label={t("events.detail.where.mapLabel")}
        />
      </div>
      {map ? (
        <MapMarker
          map={map}
          latitude={latitude}
          longitude={longitude}
          anchor="center"
        >
          <EventPin
            activity={activity}
            title={title}
            state={state}
            isCompact
          />
        </MapMarker>
      ) : null}
    </div>
  )
}
