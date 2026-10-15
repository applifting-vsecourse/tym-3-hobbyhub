import PinCircle from "@/assets/map-pin/circle.svg?react"
import PinCluster from "@/assets/map-pin/cluster.svg?react"
import PinFilled from "@/assets/map-pin/filled.svg?react"
import PinSelectedRing from "@/assets/map-pin/selected-ring.svg?react"
import PinTail from "@/assets/map-pin/tail.svg?react"
import { cn } from "@/lib/utils"

type MapPinProps =
  | { variant: "missing" | "selected" | "cluster"; count: number; className?: string }
  | { variant: "filled"; count?: never; className?: string }

const LABELS = {
  missing: (count: number) => `Akce, chybí ${count}`,
  selected: (count: number) => `Vybraná akce, chybí ${count}`,
  cluster: (count: number) => `${count} akcí`,
  filled: () => "Akce, naplněno",
}

/**
 * Pin na mapě. The number is how many people are missing; a filled event is
 * a green tick; a cluster groups nearby events; the selected pin is a circle
 * without a tail inside a full ring. Wrap it in a button to make it interactive.
 */
export function MapPin({ variant, count, className }: MapPinProps) {
  const label = LABELS[variant](count ?? 0)

  if (variant === "filled") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("inline-block h-10.25 w-9", className)}
      >
        <PinFilled
          aria-hidden
          className="size-full drop-shadow-float"
        />
      </span>
    )
  }

  if (variant === "cluster") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "relative inline-flex size-11 items-center justify-center rounded-full shadow-float",
          className,
        )}
      >
        <PinCluster
          aria-hidden
          className="absolute inset-0 size-full"
        />
        <span className="relative typo-label text-primary-foreground">{count}</span>
      </span>
    )
  }

  if (variant === "selected") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn("relative inline-flex size-12 items-center justify-center", className)}
      >
        <PinSelectedRing
          aria-hidden
          className="absolute inset-0 size-full"
        />
        <PinCircle
          aria-hidden
          className="absolute size-9 rounded-full shadow-float"
        />
        <span className="relative typo-label text-signal-foreground">{count}</span>
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("relative inline-block h-10.25 w-9 drop-shadow-float", className)}
    >
      <PinCircle
        aria-hidden
        className="absolute top-0 left-0 size-9"
      />
      <PinTail
        aria-hidden
        className="absolute top-8.5 left-3 h-1.75 w-3"
      />
      <span className="absolute inset-x-0 top-2 text-center typo-label text-signal-foreground">
        {count}
      </span>
    </span>
  )
}
