import { cn } from "@/lib/utils"

const ROUNDING = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} as const

type EventPhotoProps = {
  src: string
  alt: string
  /** Match the radius of the surface the photo sits in. */
  rounding?: keyof typeof ROUNDING
  className?: string
}

/** Fotka akce — event photo in one of three roundings (Střední, Velké, Největší). */
export function EventPhoto({ src, alt, rounding = "md", className }: EventPhotoProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-30 w-full object-cover", ROUNDING[rounding], className)}
    />
  )
}
