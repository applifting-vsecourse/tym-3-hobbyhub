import LogoAppIcon from "@/assets/logo/logo-app-icon.svg?react"
import LogoMain from "@/assets/logo/logo-main.svg?react"
import LogoMark from "@/assets/logo/logo-mark.svg?react"
import LogoSymbol from "@/assets/logo/logo-symbol.svg?react"
import LogoWordmark from "@/assets/logo/logo-wordmark.svg?react"
import { cn } from "@/lib/utils"

const LOGOS = {
  main: { Svg: LogoMain, className: "h-12.5 w-auto" },
  symbol: { Svg: LogoSymbol, className: "h-16 w-auto" },
  wordmark: { Svg: LogoWordmark, className: "h-16 w-auto" },
  "app-icon": { Svg: LogoAppIcon, className: "size-24" },
  /** The app-icon pawns without their tile, for a primary surface (the "Přidat" button). */
  mark: { Svg: LogoMark, className: "size-24" },
} as const

type LogoProps = {
  variant?: keyof typeof LOGOS
  className?: string
}

/**
 * Značka — a party of board-game pawns with hobby heads (ball, die, record)
 * and a dashed pawn for the free seat. Colours follow `foreground` and
 * `primary`, so the logo inverts in dark mode; the app icon keeps fixed colours.
 * Scale it with a height class (`h-8 w-auto`).
 */
export function Logo({ variant = "main", className }: LogoProps) {
  const { Svg, className: sizeClass } = LOGOS[variant]

  return (
    <Svg
      role="img"
      aria-label="HobbyHub"
      className={cn("max-w-full shrink-0 text-foreground", sizeClass, className)}
    />
  )
}
