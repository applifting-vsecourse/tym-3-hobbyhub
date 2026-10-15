import { useEffect, useState, type ReactNode } from "react"

import BikeFrame from "@/assets/loaders/bike-frame.svg?react"
import FreeSeat from "@/assets/loaders/free-seat.svg?react"
import NewPlayer from "@/assets/loaders/new-player.svg?react"
import Player from "@/assets/loaders/player.svg?react"
import Wheel from "@/assets/loaders/wheel.svg?react"
import { ActivityIcon } from "@/components/hobbyhub/ActivityIcon"
import { Seat } from "@/components/hobbyhub/Seat"
import { cn } from "@/lib/utils"

/** Loaders appear only after 300 ms of waiting; quick responses never flash one. */
const SHOW_AFTER_MS = 300

export type LoaderVariant = "ball" | "volleyball" | "dice" | "seats" | "bike" | "player"

function BallIllustration() {
  return (
    <>
      <ActivityIcon
        activity="basketbal"
        className="absolute top-2.5 left-1/2 size-9 -translate-x-1/2 motion-safe:animate-loader-bounce"
      />
      <span className="absolute top-15.5 left-1/2 h-1.25 w-6.5 -translate-x-1/2 rounded-full bg-foreground opacity-20 motion-safe:animate-loader-shadow" />
    </>
  )
}

function VolleyballIllustration() {
  return (
    <ActivityIcon
      activity="volejbal"
      className="absolute top-4.5 left-1/2 size-11 -translate-x-1/2 motion-safe:animate-loader-spin"
    />
  )
}

function DiceIllustration() {
  return (
    <>
      <ActivityIcon
        activity="deskove-hry"
        className="absolute top-6.75 left-1/2 size-8.5 -translate-x-1/2 motion-safe:animate-loader-roll"
      />
      <span className="absolute top-16.5 left-1/2 h-1.25 w-6 -translate-x-1/2 rounded-full bg-foreground opacity-20 motion-safe:animate-loader-roll-shadow" />
    </>
  )
}

function SeatsIllustration() {
  return (
    <div className="absolute top-8 left-1/2 flex -translate-x-1/2 gap-2">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className="relative"
        >
          <Seat
            state="missing"
            size="loader"
            className="block"
          />
          <span
            className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-loader-seat"
            style={{ animationDelay: `${index * 0.3}s` }}
          />
        </span>
      ))}
    </div>
  )
}

function BikeIllustration() {
  // Wheel positions are the Figma geometry inside the 60 × 60 frame.
  return (
    <div className="absolute top-2 left-1/2 size-15 -translate-x-1/2 text-foreground">
      <BikeFrame className="absolute inset-0 size-full" />
      {[3.75, 33.75].map((left) => (
        <Wheel
          key={left}
          className="absolute motion-safe:animate-loader-spin"
          style={{ left, top: 28.75, width: 22.5, height: 22.5 }}
        />
      ))}
    </div>
  )
}

function PlayerIllustration() {
  return (
    <div className="absolute top-6 left-1/2 flex -translate-x-1/2 gap-1.5 text-foreground">
      <Player className="h-8 w-7.5" />
      <span className="relative h-8 w-7.5">
        <FreeSeat className="absolute inset-0 size-full" />
        <NewPlayer className="absolute inset-0 size-full opacity-0 motion-safe:animate-loader-found" />
      </span>
    </div>
  )
}

const LOADERS: Record<LoaderVariant, { label: string; Illustration: () => ReactNode }> = {
  ball: { label: "Hledáme akce…", Illustration: BallIllustration },
  volleyball: { label: "Odesíláme žádost…", Illustration: VolleyballIllustration },
  dice: { label: "Vybíráme náhradníka…", Illustration: DiceIllustration },
  seats: { label: "Načítáme soupisku…", Illustration: SeatsIllustration },
  bike: { label: "Načítáme mapu…", Illustration: BikeIllustration },
  player: { label: "Hledáme hráče…", Illustration: PlayerIllustration },
}

type LoaderProps = {
  /**
   * ball — event listing (default) · volleyball — sending, e.g. a join request ·
   * dice — evaluating, picking a substitute · seats — roster and capacity ·
   * bike — map and surroundings · player — looking for players, chat sharing.
   */
  variant?: LoaderVariant
  /** Overrides the default text; a loader always has one. */
  label?: string
  /** Skip the 300 ms delay (design-system page only). */
  isImmediate?: boolean
  className?: string
}

/**
 * Loader — one at a time, with a text label, only after 300 ms, and still
 * under reduced motion.
 */
export function Loader({ variant = "ball", label, isImmediate = false, className }: LoaderProps) {
  const [isVisible, setIsVisible] = useState(isImmediate)

  useEffect(() => {
    if (isImmediate) return
    const timer = window.setTimeout(() => setIsVisible(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [isImmediate])

  const { label: defaultLabel, Illustration } = LOADERS[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex w-40 flex-col items-center", className)}
    >
      {isVisible ? (
        <>
          <div
            aria-hidden
            className="relative h-20 w-40"
          >
            <Illustration />
          </div>
          <p className="text-center typo-small text-muted-foreground">{label ?? defaultLabel}</p>
        </>
      ) : null}
    </div>
  )
}
