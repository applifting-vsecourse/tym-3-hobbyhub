import { lazy, Suspense } from "react"
import { useTranslation } from "react-i18next"

import MapPinIcon from "@/assets/ui-icons/map-pin.svg?react"
import NavigationIcon from "@/assets/ui-icons/navigation.svg?react"
import type { EventPinState } from "@/components/hobbyhub/EventPin"
import { Button } from "@/components/ui/button"

import type { EventLocation } from "@/features/event/api/eventSchemas"
import { mapsPlatform, navigationLink } from "@/features/event/lib/navigationLink"

// Mapbox is large; the detail of an event does not wait for it (and most visitors never get the map).
const EventLocationMap = lazy(() =>
  import("@/features/event/components/EventLocationMap").then((module) => ({
    default: module.EventLocationMap,
  })),
)

export type EventPlacePin = { activity: string; title: string; state: EventPinState }

type EventPlaceProps = {
  location: EventLocation
  /** The pin on the small map: the same as on the big one. */
  pin: EventPlacePin
}

/**
 * "Kde se sejdeme": the exact place with a map and a way to navigate there.
 * For the people with a seat (F-06.5), and for everyone when the organizer
 * made the address public (#218, ADR-0029).
 */
export function EventPlace({ location, pin }: EventPlaceProps) {
  const { t } = useTranslation()
  const platform =
    typeof navigator === "undefined"
      ? "other"
      : mapsPlatform(navigator.userAgent, navigator.maxTouchPoints)
  const link = navigationLink(location, platform)
  const address = [
    location.placeName,
    location.street,
    `${location.postalCode} ${location.city}`.trim(),
  ].filter(Boolean)

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-4">
      <h2 className="typo-h3 text-foreground">{t("events.detail.where.title")}</h2>
      {location.latitude !== null && location.longitude !== null ? (
        <Suspense fallback={<div className="h-48 rounded-lg bg-muted md:h-60 xl:h-80" />}>
          <EventLocationMap
            latitude={location.latitude}
            longitude={location.longitude}
            activity={pin.activity}
            title={pin.title}
            state={pin.state}
          />
        </Suspense>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <address className="flex items-start gap-2 typo-body text-foreground not-italic">
          <MapPinIcon
            aria-hidden
            className="mt-1 size-4 shrink-0 text-muted-foreground"
          />
          <span className="flex flex-col break-words">
            {address.map((line, index) => (
              <span
                key={index}
                className={index === 0 && address.length > 1 ? "typo-label" : undefined}
              >
                {line}
              </span>
            ))}
          </span>
        </address>
        <Button asChild>
          <a
            href={link.href}
            {...(link.isWebPage ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <NavigationIcon
              aria-hidden
              className="size-4"
            />
            {t("events.detail.where.navigate")}
          </a>
        </Button>
      </div>
    </section>
  )
}
