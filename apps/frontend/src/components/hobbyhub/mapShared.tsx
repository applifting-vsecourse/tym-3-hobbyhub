import { useEffect, useState, type ReactNode } from "react"
import mapboxgl from "mapbox-gl"
import { createPortal } from "react-dom"

// What the big map of events and the small map of one place have in common, kept
// apart from both so the small one does not pull in the big one.

export const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11"
export const DARK_STYLE = "mapbox://styles/mapbox/dark-v11"

export const isDark = () => document.documentElement.classList.contains("dark")

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
export function MapMarker({
  map,
  latitude,
  longitude,
  anchor,
  offsetX = 0,
  children,
}: MapMarkerProps) {
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
