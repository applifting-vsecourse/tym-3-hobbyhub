import type { CSSProperties } from "react"
import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MapPin } from "@/components/hobbyhub/MapPin"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { YourSeat } from "@/components/hobbyhub/YourSeat"
import { Button } from "@/components/ui/button"
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll"
import { cn } from "@/lib/utils"

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const

type StepKey = (typeof STEP_KEYS)[number]

/** Where a step stands against the one the reader is at. */
type StepState = "done" | "current" | "upcoming"

function stepState(index: number, current: number): StepState {
  if (index < current) return "done"
  if (index === current) return "current"
  return "upcoming"
}

/** The round marker of a step: filled once done, outlined while current, faint before. */
function StepMarker({ state, number }: { state: StepState; number: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border-2 typo-label font-heading transition-colors duration-500",
        state === "done" && "border-primary bg-primary text-primary-foreground",
        state === "current" && "border-primary text-primary",
        state === "upcoming" && "border-border text-muted-foreground",
      )}
    >
      {state === "done" ? <Check className="size-5" /> : number}
    </span>
  )
}

/** The pictures from the kit, one per step: what the app looks like at that point. */
function StepPicture({ step }: { step: StepKey }) {
  const { t } = useTranslation()
  switch (step) {
    case "step1":
      // Three on the roster, two missing to the minimum: one row of five.
      return (
        <div className="flex flex-col gap-3">
          <RosterSeats
            size="lg"
            taken={3}
            capacity={5}
          />
          <span className="w-fit rounded-full bg-signal px-2.5 py-0.75 typo-small text-signal-foreground">
            {t("hobbyhub.capacity.missing", { count: 2 })}
          </span>
        </div>
      )
    case "step2":
      // The same event on the map, and the seat that invites you in.
      return (
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-end gap-3">
            <MapPin
              variant="missing"
              count={2}
            />
            <MapPin variant="filled" />
            <MapPin
              variant="cluster"
              count={3}
            />
          </div>
          <YourSeat
            title={t("landing.how.preview.yourSeatTitle")}
            description={t("landing.how.preview.yourSeatText")}
            action={
              <Button
                size="sm"
                tabIndex={-1}
              >
                {t("landing.how.preview.take")}
              </Button>
            }
          />
        </div>
      )
    case "step3":
      // Approved, minimum met.
      return (
        <div className="flex flex-col gap-3">
          <RosterSeats
            size="lg"
            taken={5}
            capacity={5}
          />
          <StatusBadge
            status="approved"
            className="w-fit"
          />
        </div>
      )
    case "step4":
      // The crew that stays together, with its usual slot.
      return (
        <div className="flex w-full flex-col gap-3">
          <RosterSeats
            taken={5}
            capacity={5}
          />
          <ScheduleRow
            time={t("landing.how.preview.scheduleTime")}
            title={t("landing.how.preview.scheduleTitle")}
            subtitle={t("landing.how.preview.scheduleSubtitle")}
            activity="florbal"
            taken={5}
            min={5}
          />
        </div>
      )
  }
}

/**
 * "Jak to funguje" (#151): a vertical stepper. Each step is one row: on the
 * left its marker on a rail (and from `lg` a short heading), on the right the
 * step itself with a title, two paragraphs and a picture from the kit. The
 * reader's position decides every row's state at once — the steps above are
 * done, the one on screen is current, the ones below are still to come and
 * drawn faint — so the rail and the text always agree.
 */
export function HowItWorks({ className, style }: { className?: string; style?: CSSProperties }) {
  const { t } = useTranslation()
  const { active, register } = useRevealOnScroll(STEP_KEYS.length)

  return (
    <section
      aria-labelledby="how-heading"
      className={cn("flex flex-col gap-6 md:gap-8", className)}
      style={style}
    >
      <h2
        id="how-heading"
        className="typo-h3"
      >
        {t("landing.how.title")}
      </h2>
      <ol className="flex flex-col">
        {STEP_KEYS.map((key, index) => {
          const state = stepState(index, active)
          const isLast = index === STEP_KEYS.length - 1
          return (
            <li
              key={key}
              ref={register(index)}
              className="grid grid-cols-[auto_1fr] gap-x-4 md:gap-x-6 lg:grid-cols-[auto_16rem_1fr] lg:gap-x-8"
            >
              {/* The marker and the rail down to the next step. */}
              <div
                aria-hidden
                className="flex flex-col items-center"
              >
                <StepMarker
                  state={state}
                  number={index + 1}
                />
                {isLast ? null : (
                  <span
                    className={cn(
                      "my-1 w-0.5 flex-1 rounded-full transition-colors duration-500",
                      state === "done" ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
              {/* The short heading beside the marker, wide screens only; it repeats
                  the step's heading, so a screen reader gets it once. */}
              <div
                aria-hidden
                className={cn(
                  "hidden flex-col gap-1 pt-2 transition-opacity duration-500 lg:flex",
                  state === "upcoming" ? "opacity-50" : "opacity-100",
                )}
              >
                <p
                  className={cn(
                    "typo-title transition-colors duration-500",
                    state === "current" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {t(`landing.how.${key}.short`)}
                </p>
                <p className="typo-small text-muted-foreground">
                  {t(`landing.how.${key}.subtitle`)}
                </p>
              </div>
              <div
                className={cn(
                  "flex flex-col gap-6 pt-2 transition-opacity duration-500 motion-safe:transition-[opacity,transform] md:flex-row md:items-start md:justify-between md:gap-12",
                  isLast ? "pb-2" : "pb-16 lg:pb-24",
                  state === "upcoming" ? "opacity-40 motion-safe:translate-y-4" : "opacity-100",
                )}
              >
                <div className="flex max-w-xl flex-col gap-3">
                  <p className="typo-caption text-muted-foreground">
                    {t("landing.how.stepLabel", { number: index + 1 })}
                  </p>
                  <h3 className="typo-h2">{t(`landing.how.${key}.title`)}</h3>
                  <p className="typo-body text-muted-foreground">{t(`landing.how.${key}.p1`)}</p>
                  <p className="typo-body text-muted-foreground">{t(`landing.how.${key}.p2`)}</p>
                </div>
                <div
                  aria-hidden
                  className="w-full shrink-0 md:w-80"
                >
                  <StepPicture step={key} />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {/* The way in, once the reader has seen how it works: centred under the
          steps, the main one filled. */}
      <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center md:pt-8">
        <Button
          asChild
          size="lg"
          className="w-full sm:w-auto"
        >
          <Link to={ROUTES.events}>{t("landing.actions.find")}</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="w-full sm:w-auto"
        >
          <Link to={ROUTES.newEvent}>{t("landing.actions.create")}</Link>
        </Button>
      </div>
    </section>
  )
}
