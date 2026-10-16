import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ChatShare } from "@/components/hobbyhub/ChatShare"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

type ShareEventSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Chat message without the link, e.g. "Čtvrtek florbal, chybí 1. Potvrď, jestli jdeš:" */
  message: string
  /** Public event page; anyone can view it without an account. */
  url: string
  /** Why to share, e.g. "Chybí 1 člověk do minima. Pošli zprávu do skupiny…" */
  description?: string
  trigger?: ReactNode
}

// Share targets look like filter chips (Figma "Kam poslat") but are links or buttons.
const targetClass = cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")

/**
 * Sdílet do chatu — opened from an event with missing people. The organiser
 * copies a ready-made message or sends the link straight to a chat app.
 */
export function ShareEventSheet({
  isOpen,
  onOpenChange,
  message,
  url,
  description,
  trigger,
}: ShareEventSheetProps) {
  const { t } = useTranslation()
  const text = `${message} ${url}`

  const copy = async (value: string, success: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(success)
    } catch {
      toast.error(t("hobbyhub.shareSheet.copyFailed"))
    }
  }

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t("hobbyhub.shareSheet.title")}
      description={description ?? t("hobbyhub.shareSheet.description")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="typo-label-lg text-muted-foreground">{t("hobbyhub.shareSheet.message")}</p>
          <ChatShare
            message={message}
            url={url}
          />
        </div>

        <h3 className="typo-h3 text-foreground">{t("hobbyhub.shareSheet.where")}</h3>
        <ul className="flex flex-wrap gap-2">
          <li>
            <a
              className={targetClass}
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </li>
          <li>
            {/* Messenger and Discord cannot prefill a message from the web, so we copy it. */}
            <button
              type="button"
              className={targetClass}
              onClick={() => copy(text, t("hobbyhub.shareSheet.copiedMessenger"))}
            >
              Messenger
            </button>
          </li>
          <li>
            <a
              className={targetClass}
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("hobbyhub.shareSheet.facebook")}
            </a>
          </li>
          <li>
            <button
              type="button"
              className={targetClass}
              onClick={() => copy(text, t("hobbyhub.shareSheet.copiedDiscord"))}
            >
              Discord
            </button>
          </li>
          <li>
            <button
              type="button"
              className={targetClass}
              onClick={() => copy(url, t("hobbyhub.shareSheet.linkCopied"))}
            >
              {t("hobbyhub.shareSheet.copyLink")}
            </button>
          </li>
        </ul>
        <p className="typo-small text-muted-foreground">{t("hobbyhub.shareSheet.note")}</p>
      </div>
    </ResponsiveSheet>
  )
}
