import { lazy, Suspense, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import ChatIcon from "@/assets/ui-icons/chat.svg?react"
import MailIcon from "@/assets/ui-icons/mail.svg?react"
import MapPinIcon from "@/assets/ui-icons/map-pin.svg?react"
import NavigationIcon from "@/assets/ui-icons/navigation.svg?react"
import PhoneIcon from "@/assets/ui-icons/phone.svg?react"
import type { EventPinState } from "@/components/hobbyhub/EventPin"
import { Button } from "@/components/ui/button"

import type { ParticipantInfo as ParticipantInfoData } from "@/features/event/api/eventSchemas"
import { contactHref, contactKind } from "@/features/event/lib/contact"
import { mapsPlatform, navigationLink } from "@/features/event/lib/navigationLink"

// Mapbox is large; the detail of an event does not wait for it (and most visitors never get the map).
const EventLocationMap = lazy(() =>
  import("@/features/event/components/EventLocationMap").then((module) => ({
    default: module.EventLocationMap,
  })),
)

type ParticipantInfoProps = {
  info: ParticipantInfoData
  /** The pin on the small map: the same as on the big one. */
  pin: { activity: string; title: string; state: EventPinState }
}

function ContactLink({
  href,
  icon,
  label,
  isExternal = false,
}: {
  href: string
  icon: ReactNode
  label: string
  isExternal?: boolean
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="justify-start"
    >
      <a
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {icon}
        <span className="truncate">{label}</span>
      </a>
    </Button>
  )
}

/**
 * What a person with a confirmed seat gets on top of the public detail (F-06.5):
 * the exact place with a map and a way to navigate there, and the ways to reach
 * the organizer. A part with nothing to show is left out.
 */
export function ParticipantInfo({ info, pin }: ParticipantInfoProps) {
  const { t } = useTranslation()
  const { location } = info
  const kind = info.contact ? contactKind(info.contact) : null
  const hasContacts = Boolean(info.externalChatUrl ?? kind)

  if (!location && !hasContacts) return null

  const platform =
    typeof navigator === "undefined"
      ? "other"
      : mapsPlatform(navigator.userAgent, navigator.maxTouchPoints)
  const link = location ? navigationLink(location, platform) : null
  const address = location
    ? [
        location.placeName,
        location.street,
        `${location.postalCode} ${location.city}`.trim(),
      ].filter(Boolean)
    : []

  return (
    <>
      {location && link ? (
        <section className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="typo-h3 text-foreground">{t("events.detail.where.title")}</h2>
          {location.latitude !== null && location.longitude !== null ? (
            <Suspense fallback={<div className="h-48 rounded-lg bg-muted md:h-60" />}>
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
      ) : null}

      {hasContacts ? (
        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="typo-h3 text-foreground">{t("events.detail.contacts.title")}</h2>
          <p className="typo-small text-muted-foreground">
            {t("events.detail.contacts.organizer", { name: info.organizerName })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {info.externalChatUrl ? (
              <ContactLink
                href={info.externalChatUrl}
                isExternal
                icon={
                  <ChatIcon
                    aria-hidden
                    className="size-4"
                  />
                }
                label={t("events.detail.contacts.chat")}
              />
            ) : null}
            {info.contact && kind ? (
              <ContactLink
                href={contactHref(info.contact, kind)}
                icon={
                  kind === "phone" ? (
                    <PhoneIcon
                      aria-hidden
                      className="size-4"
                    />
                  ) : (
                    <MailIcon
                      aria-hidden
                      className="size-4"
                    />
                  )
                }
                label={
                  kind === "phone"
                    ? `${t("events.detail.contacts.phone")} ${info.contact}`
                    : info.contact
                }
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  )
}
