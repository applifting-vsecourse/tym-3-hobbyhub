import type { CSSProperties, ReactNode } from "react"

import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { cn } from "@/lib/utils"

type HeroProps = {
  /** Small line above the title, e.g. "Čtvrteční florbal · dnes 19:00". */
  kicker: string
  title: string
  text: string
  taken: number
  capacity: number
  /** Primary action, e.g. <Button>Obsadit místo</Button>. */
  action: ReactNode
  /** Secondary action, e.g. <Button variant="secondary">Vypsat akci</Button>: under the primary on a phone, beside it from `md`. */
  secondaryAction?: ReactNode
  titleAs?: "h1" | "h2"
  /** Seats pop in one by one on first render, the text rises in step by step, the free seats then breathe. */
  isAnimated?: boolean
  className?: string
}

/**
 * Hrdinská plocha — the dark signal surface with the roster. Stacked on
 * mobile, text beside the roster from `md`. Signal is reserved for this
 * surface, the roster band in e-mails, the desktop roster card and "chybí N".
 */
export function Hero({
  kicker,
  title,
  text,
  taken,
  capacity,
  action,
  secondaryAction,
  titleAs: Title = "h2",
  isAnimated = false,
  className,
}: HeroProps) {
  // The texts rise in one after another, ahead of the seats (`--seat-delay`).
  const rise = (index: number) =>
    isAnimated
      ? { className: "enter", style: { "--enter-index": index } as CSSProperties }
      : { className: undefined, style: undefined }

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-signal p-5 md:flex-row md:items-center md:gap-12 md:px-12 md:py-10",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
        <p
          className={cn("typo-small text-signal-soft", rise(0).className)}
          style={rise(0).style}
        >
          {kicker}
        </p>
        <Title
          className={cn(
            "typo-h1 text-balance text-signal-foreground lg:typo-display",
            rise(1).className,
          )}
          style={rise(1).style}
        >
          {title}
        </Title>
        <RosterSeats
          size="lg"
          surface="dark"
          taken={taken}
          capacity={capacity}
          isAnimated={isAnimated}
          isInviting={isAnimated}
          className="md:hidden"
        />
        <p
          className={cn("typo-body text-signal-soft md:typo-body-lg", rise(2).className)}
          style={rise(2).style}
        >
          {text}
        </p>
        <div className="flex flex-col gap-3 pt-1 *:max-md:w-full md:flex-row">
          {action}
          {secondaryAction}
        </div>
      </div>
      <RosterSeats
        size="lg"
        surface="dark"
        taken={taken}
        capacity={capacity}
        isAnimated={isAnimated}
        isInviting={isAnimated}
        className="hidden md:grid xl:hidden"
      />
      <RosterSeats
        size="xl"
        surface="dark"
        taken={taken}
        capacity={capacity}
        isAnimated={isAnimated}
        isInviting={isAnimated}
        className="hidden xl:grid"
      />
    </section>
  )
}
