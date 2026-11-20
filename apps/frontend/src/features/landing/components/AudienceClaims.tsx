import type { CSSProperties } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const BULLET_KEYS = ["b1", "b2", "b3"] as const

type Side = "player" | "organizer"

function Claim({ side, index }: { side: Side; index: number }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex reveal flex-col gap-4"
      style={{ "--reveal-index": index } as CSSProperties}
    >
      {/* What this person sees in the app: the player a free seat, the organizer
          the missing count. A picture, so it is hidden from a screen reader. */}
      <div
        aria-hidden
        className="flex flex-col gap-3 pb-3"
      >
        <RosterSeats
          size="lg"
          isInviting
          taken={side === "player" ? 4 : 3}
          capacity={5}
        />
        <span className="w-fit rounded-full bg-signal px-2.5 py-0.75 typo-small text-signal-foreground">
          {t("hobbyhub.capacity.missing", { count: side === "player" ? 1 : 2 })}
        </span>
      </div>
      <h3 className="typo-h2">{t(`landing.audience.${side}.title`)}</h3>
      <p className="max-w-md typo-body-lg text-muted-foreground">
        {t(`landing.audience.${side}.text`)}
      </p>
      <ul className="flex flex-col gap-3">
        {BULLET_KEYS.map((key, bulletIndex) => (
          <li
            key={key}
            className="flex reveal items-start gap-3 typo-body transition-transform duration-200 motion-safe:hover:translate-x-1"
            style={{ "--reveal-index": bulletIndex + 1 } as CSSProperties}
          >
            <Check
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-foreground"
            />
            {t(`landing.audience.${side}.${key}`)}
          </li>
        ))}
      </ul>
      <div className="pt-4 *:max-md:w-full">
        {side === "player" ? (
          <Button
            asChild
            className="group"
          >
            <Link to={ROUTES.events}>
              {t("landing.actions.find")}
              <ArrowRight
                aria-hidden
                className="transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="group"
          >
            <Link to={ROUTES.newEvent}>
              {t("landing.actions.create")}
              <ArrowRight
                aria-hidden
                className="transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The two people the app is for, side by side (#216): the player who wants a
 * seat and the organizer who is short of people. Not cards: two columns split
 * by a hairline, stacked under one another on a phone.
 */
export function AudienceClaims({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="audience-heading"
      className={cn("flex flex-col gap-6", className)}
      style={style}
    >
      <h2
        id="audience-heading"
        className="sr-only"
      >
        {t("landing.audience.title")}
      </h2>
      <div className="grid gap-12 max-md:*:last:border-t max-md:*:last:border-border max-md:*:last:pt-12 md:grid-cols-2 md:gap-0 md:*:first:pr-16 md:*:last:border-l md:*:last:border-border md:*:last:pl-16">
        <Claim
          side="player"
          index={0}
        />
        <Claim
          side="organizer"
          index={1}
        />
      </div>
    </section>
  )
}
