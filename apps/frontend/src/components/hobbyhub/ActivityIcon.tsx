import type { ComponentType, SVGProps } from "react"

import BadmintonIcon from "@/assets/activity-icons/badminton.svg?react"
import BasketbalIcon from "@/assets/activity-icons/basketbal.svg?react"
import BehIcon from "@/assets/activity-icons/beh.svg?react"
import CviceniIcon from "@/assets/activity-icons/cviceni.svg?react"
import CyklistikaIcon from "@/assets/activity-icons/cyklistika.svg?react"
import DeskoveHryIcon from "@/assets/activity-icons/deskove-hry.svg?react"
import FlorbalIcon from "@/assets/activity-icons/florbal.svg?react"
import FotbalIcon from "@/assets/activity-icons/fotbal.svg?react"
import LanPartyIcon from "@/assets/activity-icons/lan-party.svg?react"
import OstatniIcon from "@/assets/activity-icons/ostatni.svg?react"
import PlavaniIcon from "@/assets/activity-icons/plavani.svg?react"
import SachyIcon from "@/assets/activity-icons/sachy.svg?react"
import StolniTenisIcon from "@/assets/activity-icons/stolni-tenis.svg?react"
import TenisIcon from "@/assets/activity-icons/tenis.svg?react"
import TuristikaIcon from "@/assets/activity-icons/turistika.svg?react"
import VolejbalIcon from "@/assets/activity-icons/volejbal.svg?react"
import { cn } from "@/lib/utils"

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>

/** The 16 sport and game activities from Figma "Ikony aktivit (Ikona)". */
export const ACTIVITIES = {
  florbal: { label: "Florbal", Icon: FlorbalIcon },
  volejbal: { label: "Volejbal", Icon: VolejbalIcon },
  tenis: { label: "Tenis", Icon: TenisIcon },
  fotbal: { label: "Fotbal", Icon: FotbalIcon },
  basketbal: { label: "Basketbal", Icon: BasketbalIcon },
  beh: { label: "Běh", Icon: BehIcon },
  cyklistika: { label: "Cyklistika", Icon: CyklistikaIcon },
  plavani: { label: "Plavání", Icon: PlavaniIcon },
  "stolni-tenis": { label: "Stolní tenis", Icon: StolniTenisIcon },
  badminton: { label: "Badminton", Icon: BadmintonIcon },
  "deskove-hry": { label: "Deskové hry", Icon: DeskoveHryIcon },
  sachy: { label: "Šachy", Icon: SachyIcon },
  "lan-party": { label: "LAN party", Icon: LanPartyIcon },
  turistika: { label: "Turistika", Icon: TuristikaIcon },
  ostatni: { label: "Ostatní", Icon: OstatniIcon },
  cviceni: { label: "Cvičení", Icon: CviceniIcon },
} satisfies Record<string, { label: string; Icon: SvgComponent }>

export type Activity = keyof typeof ACTIVITIES

export const ACTIVITY_KEYS = Object.keys(ACTIVITIES) as Activity[]

type ActivityIconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  activity: Activity
  /** Pass when the icon carries meaning on its own; otherwise it is decorative. */
  label?: string
}

/**
 * Sport/game icon on a 24 px grid, 1.75 px stroke, coloured by `currentColor`
 * (the foreground token by default). Size it with `size-*`.
 */
export function ActivityIcon({ activity, label, className, ...props }: ActivityIconProps) {
  const { Icon } = ACTIVITIES[activity]

  return (
    <Icon
      {...props}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("size-6 shrink-0", className)}
    />
  )
}
