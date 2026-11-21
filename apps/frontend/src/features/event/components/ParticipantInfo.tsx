import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import ChatIcon from "@/assets/ui-icons/chat.svg?react"
import MailIcon from "@/assets/ui-icons/mail.svg?react"
import PhoneIcon from "@/assets/ui-icons/phone.svg?react"
import { Button } from "@/components/ui/button"

import type { ParticipantInfo as ParticipantInfoData } from "@/features/event/api/eventSchemas"
import { EventPlace, type EventPlacePin } from "@/features/event/components/EventPlace"
import { contactHref, contactKind } from "@/features/event/lib/contact"

type ParticipantInfoProps = {
  info: ParticipantInfoData
  /** The pin on the small map: the same as on the big one. */
  pin: EventPlacePin
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

  return (
    <>
      {location ? (
        <EventPlace
          location={location}
          pin={pin}
        />
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
