import type { ReactNode } from "react"
import { Link2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import DiscordIcon from "@/assets/ui-icons/brand-discord.svg?react"
import FacebookIcon from "@/assets/ui-icons/brand-facebook.svg?react"
import MessengerIcon from "@/assets/ui-icons/brand-messenger.svg?react"
import WhatsAppIcon from "@/assets/ui-icons/brand-whatsapp.svg?react"
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
const targetClass = cn(
  toggleVariants({ variant: "chip" }),
  "size-11 justify-center p-0 [&_svg]:size-5",
)

type Target = { key: string; icon: ReactNode } & (
  { href: string } | { copyText: string; copied: string }
)

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

  const targets: Target[] = [
    {
      key: "whatsapp",
      icon: <WhatsAppIcon aria-hidden />,
      href: `https://wa.me/?text=${encodeURIComponent(text)}`,
    },
    {
      key: "messenger",
      icon: <MessengerIcon aria-hidden />,
      copyText: text,
      copied: t("hobbyhub.shareSheet.copiedMessenger"),
    },
    {
      key: "facebook",
      icon: <FacebookIcon aria-hidden />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: "discord",
      icon: <DiscordIcon aria-hidden />,
      copyText: text,
      copied: t("hobbyhub.shareSheet.copiedDiscord"),
    },
    {
      key: "link",
      icon: <Link2 aria-hidden />,
      copyText: url,
      copied: t("hobbyhub.shareSheet.linkCopied"),
    },
  ]

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t("hobbyhub.shareSheet.title")}
      description={description ?? t("hobbyhub.shareSheet.description")}
    >
      <div className="flex flex-col gap-4">
        <ChatShare
          message={message}
          url={url}
        />

        <h3 className="border-t border-border pt-4 typo-h3 text-foreground">
          {t("hobbyhub.shareSheet.where")}
        </h3>
        <ul className="flex flex-wrap gap-3">
          {targets.map((target) => (
            <li key={target.key}>
              {"href" in target ? (
                <a
                  className={targetClass}
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`hobbyhub.shareSheet.target.${target.key}`)}
                >
                  {target.icon}
                </a>
              ) : (
                // Messenger and Discord cannot prefill a message from the web, so we copy it.
                <button
                  type="button"
                  className={targetClass}
                  aria-label={t(`hobbyhub.shareSheet.target.${target.key}`)}
                  onClick={() => copy(target.copyText, target.copied)}
                >
                  {target.icon}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="typo-small text-muted-foreground">{t("hobbyhub.shareSheet.note")}</p>
      </div>
    </ResponsiveSheet>
  )
}
