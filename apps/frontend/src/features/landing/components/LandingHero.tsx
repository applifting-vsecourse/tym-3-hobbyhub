import type { CSSProperties } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ActivityAvatar, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The crew of the hero: illustrated people of different activities, and one
// dashed free place with a plus at the end, the one the visitor would take.
const CREW: AvatarKind[] = [
  "fotbalista",
  "volejbalistka",
  "deskar",
  "bezec",
  "tenistka",
  "cyklista",
]

const rise = (index: number) => ({
  className: "enter",
  style: { "--enter-index": index } as CSSProperties,
})

/**
 * The landing hero (#215) for everyone, signed in or not, without a greeting:
 * a crew with one free place, and the line that puts the event first and the
 * crew second ("Najdi akci. Parta přijde sama."). The page's one `h1` and
 * its one coloured surface.
 */
export function LandingHero({ freeEventCount }: { freeEventCount?: number }) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col items-center gap-5 rounded-xl bg-signal px-5 py-9 text-center md:gap-6 md:px-12 md:py-16">
      <div
        aria-hidden
        className="flex flex-wrap items-end justify-center gap-1 md:gap-2"
      >
        {CREW.map((kind, index) => (
          <span
            key={kind}
            className="flex seat-enter even:-translate-y-2"
            style={{ "--seat-index": index } as CSSProperties}
          >
            <ActivityAvatar
              avatar={kind}
              size="lg"
              tone="inverse"
              className="md:size-22"
            />
          </span>
        ))}
        <span
          className="flex seat-enter"
          style={{ "--seat-index": CREW.length } as CSSProperties}
        >
          <span className="flex seat-invite">
            <ActivityAvatar
              avatar="free"
              size="lg"
              tone="inverse"
              className="md:size-22"
            />
          </span>
        </span>
      </div>
      <h1
        className={cn(
          "max-w-3xl typo-h1 text-balance text-signal-foreground lg:typo-display",
          rise(0).className,
        )}
        style={rise(0).style}
      >
        {t("landing.hero.titleFind")}{" "}
        <span className="text-signal-soft">{t("landing.hero.titleCrew")}</span>
      </h1>
      <p
        className={cn("max-w-xl typo-body text-signal-soft md:typo-body-lg", rise(1).className)}
        style={rise(1).style}
      >
        {freeEventCount ? (
          // The number changes as events come and go: it stands out as a live figure.
          <Trans
            t={t}
            i18nKey="landing.hero.textCount"
            count={freeEventCount}
            values={{ count: freeEventCount }}
            components={{
              count: (
                <span className="mx-0.5 inline-flex items-center rounded-full bg-signal-foreground/10 px-2.5 align-baseline typo-numeral text-signal-foreground" />
              ),
            }}
          />
        ) : (
          t("landing.hero.textPlain")
        )}
      </p>
      <div className="flex w-full flex-col justify-center gap-3 pt-1 md:w-auto md:flex-row">
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
        <Button
          asChild
          variant="secondary"
        >
          <Link to={ROUTES.newEvent}>{t("landing.actions.create")}</Link>
        </Button>
      </div>
    </section>
  )
}
