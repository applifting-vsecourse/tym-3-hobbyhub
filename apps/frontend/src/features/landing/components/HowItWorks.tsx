import type { CSSProperties, ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { Seat } from "@/components/hobbyhub/Seat"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function SeatsOf({ taken, free }: { taken: number; free: number }) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: taken }, (_, index) => (
        <Seat
          key={`t${index}`}
          state="taken"
        />
      ))}
      {Array.from({ length: free }, (_, index) => (
        <Seat
          key={`f${index}`}
          state="free"
        />
      ))}
    </span>
  )
}

// The picture of each step: a free seat, then the viewer's own seat taken,
// then the crew that stays. Decorative; the text says it all.
const STEPS: { key: "find" | "join" | "crew"; picture: ReactNode }[] = [
  {
    key: "find",
    picture: (
      <SeatsOf
        taken={3}
        free={1}
      />
    ),
  },
  {
    key: "join",
    picture: (
      <>
        <SeatsOf
          taken={3}
          free={0}
        />
        <ActivityAvatar
          avatar="florbalista"
          size="xs"
        />
      </>
    ),
  },
  {
    key: "crew",
    picture: (
      <span className="flex -space-x-1.5">
        {(["fotbalista", "bezec", "florbalista", "tenistka"] as const).map((kind) => (
          <ActivityAvatar
            key={kind}
            avatar={kind}
            size="sm"
          />
        ))}
      </span>
    ),
  },
]

/**
 * "Jak to funguje" (#215): a stop in the middle of the page. Framed by a solid
 * `primary` line (the dashed one is the invitation to groups): the heading,
 * one sentence and the way to the events on the left, the three steps on one
 * dashed line on the right, the event first and the crew as what comes of it.
 */
export function HowItWorks({ className, style }: { className?: string; style?: CSSProperties }) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="how-heading"
      className={cn(
        "grid gap-8 rounded-xl border-2 border-primary px-5 py-8 md:p-12 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16",
        className,
      )}
      style={style}
    >
      <div className="flex flex-col items-start gap-4">
        <h2
          id="how-heading"
          className="typo-h2"
        >
          {t("landing.how.title")}
        </h2>
        <p className="typo-body-lg text-muted-foreground">{t("landing.how.intro")}</p>
        <Button
          asChild
          className="max-md:w-full"
        >
          <Link to={ROUTES.events}>{t("landing.actions.find")}</Link>
        </Button>
      </div>
      <ol className="flex flex-col">
        {STEPS.map(({ key, picture }, index) => (
          <li
            key={key}
            className="relative grid reveal grid-cols-[3rem_1fr] gap-x-4 pb-6 last:pb-0"
            style={{ "--reveal-index": index } as CSSProperties}
          >
            {/* The line down to the next step. */}
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-12 bottom-0 left-6 border-l-2 border-dashed border-border"
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-12 items-center justify-center rounded-full border-2 border-primary typo-label-lg",
                index === STEPS.length - 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-primary",
              )}
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1 pt-2">
              <h3 className="typo-title">{t(`landing.how.${key}.title`)}</h3>
              <p className="typo-body text-muted-foreground">{t(`landing.how.${key}.text`)}</p>
              <div
                aria-hidden
                className="flex items-center gap-2 pt-2"
              >
                {picture}
                {key === "join" ? (
                  <StatusBadge status="approved">{t("hobbyhub.viewerState.joined")}</StatusBadge>
                ) : null}
                {key === "crew" ? (
                  <StatusBadge status="neutral">{t("landing.how.crew.badge")}</StatusBadge>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
