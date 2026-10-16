import type { ReactNode } from "react"

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
  /** Desktop-only secondary action, e.g. <Button variant="secondary">Vypsat akci</Button>. */
  secondaryAction?: ReactNode
  titleAs?: "h1" | "h2"
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
  className,
}: HeroProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-signal p-5 md:flex-row md:items-center md:gap-12 md:px-12 md:py-10",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
        <p className="typo-small text-signal-soft">{kicker}</p>
        <Title className="typo-h1 text-balance text-signal-foreground lg:typo-display">
          {title}
        </Title>
        <RosterSeats
          size="lg"
          surface="dark"
          taken={taken}
          capacity={capacity}
          className="md:hidden"
        />
        <p className="typo-body text-signal-soft md:typo-body-lg">{text}</p>
        <div className="flex gap-3 *:max-md:w-full">
          {action}
          {secondaryAction ? <div className="hidden md:contents">{secondaryAction}</div> : null}
        </div>
      </div>
      <RosterSeats
        size="lg"
        surface="dark"
        taken={taken}
        capacity={capacity}
        className="hidden md:grid xl:hidden"
      />
      <RosterSeats
        size="xl"
        surface="dark"
        taken={taken}
        capacity={capacity}
        className="hidden xl:grid"
      />
    </section>
  )
}
