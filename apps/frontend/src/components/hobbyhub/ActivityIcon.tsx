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
  florbal: { Icon: FlorbalIcon },
  volejbal: { Icon: VolejbalIcon },
  tenis: { Icon: TenisIcon },
  fotbal: { Icon: FotbalIcon },
  basketbal: { Icon: BasketbalIcon },
  beh: { Icon: BehIcon },
  cyklistika: { Icon: CyklistikaIcon },
  plavani: { Icon: PlavaniIcon },
  "stolni-tenis": { Icon: StolniTenisIcon },
  badminton: { Icon: BadmintonIcon },
  "deskove-hry": { Icon: DeskoveHryIcon },
  sachy: { Icon: SachyIcon },
  "lan-party": { Icon: LanPartyIcon },
  turistika: { Icon: TuristikaIcon },
  ostatni: { Icon: OstatniIcon },
  cviceni: { Icon: CviceniIcon },
} satisfies Record<string, { Icon: SvgComponent }>

export type Activity = keyof typeof ACTIVITIES

export const ACTIVITY_KEYS = Object.keys(ACTIVITIES) as Activity[]

/** Icon keys come from the API as plain strings; not every one has an icon. */
export const isActivityKey = (key: string): key is Activity => Object.hasOwn(ACTIVITIES, key)

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
