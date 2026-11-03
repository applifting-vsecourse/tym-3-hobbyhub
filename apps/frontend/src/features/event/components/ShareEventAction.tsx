import { useState } from "react"
import { Share2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { missingCount } from "@/components/hobbyhub/capacity"
import { ShareEventSheet } from "@/components/hobbyhub/ShareEventSheet"
import { Button } from "@/components/ui/button"

import type { EventDetail } from "@/features/event/api/eventSchemas"
import { eventTime } from "@/features/event/lib/eventLabels"

type ShareEventActionProps = {
  readonly event: Pick<EventDetail, "id" | "title" | "startAt" | "takenCount" | "minParticipants">
}

/** F-05.4: copy the public link of an event, with a ready message for a chat. */
export function ShareEventAction({ event }: ShareEventActionProps) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const missing = missingCount({ taken: event.takenCount, min: event.minParticipants })
  // A date, not "zítra": the message is read in a chat long after it is pasted.
  const when = `${new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(event.startAt)}, ${eventTime(event.startAt, i18n.language)}`
  const message = t(missing > 0 ? "events.share.messageMissing" : "events.share.message", {
    title: event.title,
    when,
    count: missing,
  })

  return (
    <ShareEventSheet
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      message={message}
      url={`${window.location.origin}/events/${event.id}`}
      description={
        missing > 0 ? t("events.share.descriptionMissing", { count: missing }) : undefined
      }
      trigger={
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label={t("events.share.button")}
        >
          <Share2 aria-hidden />
        </Button>
      }
    />
  )
}
