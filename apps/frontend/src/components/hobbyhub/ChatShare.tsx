import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ChatShareProps = {
  /** e.g. "Čtvrtek florbal, chybí 2. Potvrď, jestli jdeš:" */
  message: string
  url: string
  className?: string
}

/**
 * Sdílení do chatu — a preview of the message the organiser pastes into a
 * group chat, with copy and native share.
 */
export function ChatShare({ message, url, className }: ChatShareProps) {
  const text = `${message} ${url}`
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Zpráva je zkopírovaná")
    } catch {
      toast.error("Zprávu se nepodařilo zkopírovat")
    }
  }

  const share = async () => {
    try {
      await navigator.share({ text: message, url })
    } catch {
      // The user closed the share sheet; nothing to report.
    }
  }

  return (
    <div className={cn("flex w-full flex-col items-start gap-4", className)}>
      <div className="flex flex-col items-start gap-1 rounded-lg rounded-bl-sm bg-muted px-4 py-3">
        <p className="typo-body text-foreground">{message}</p>
        <a
          href={url}
          className="rounded-sm bg-accent px-2 py-1 typo-small text-accent-foreground underline-offset-4 hover:underline"
        >
          odkaz na akci
        </a>
      </div>
      <div className="flex gap-3">
        <Button
          size="sm"
          onClick={copy}
        >
          Zkopírovat zprávu
        </Button>
        {canShare ? (
          <Button
            size="sm"
            variant="outline"
            onClick={share}
          >
            Sdílet
          </Button>
        ) : null}
      </div>
    </div>
  )
}
