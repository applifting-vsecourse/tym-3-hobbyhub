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
import CategoryBehAKoloIcon from "@/assets/category-icons/beh-a-kolo.svg?react"
import CategoryBojoveSportyIcon from "@/assets/category-icons/bojove-sporty.svg?react"
import CategoryDeskoveAKaretniHryIcon from "@/assets/category-icons/deskove-a-karetni-hry.svg?react"
import CategoryFitnessIcon from "@/assets/category-icons/fitness.svg?react"
import CategoryKvizyATerenniHryIcon from "@/assets/category-icons/kvizy-a-terenni-hry.svg?react"
import CategoryMicoveSportyIcon from "@/assets/category-icons/micove-sporty.svg?react"
import CategoryOutdoorIcon from "@/assets/category-icons/outdoor.svg?react"
import CategoryPresnostIcon from "@/assets/category-icons/presnost.svg?react"
import CategoryRaketoveSportyIcon from "@/assets/category-icons/raketove-sporty.svg?react"
import CategoryTanecIcon from "@/assets/category-icons/tanec.svg?react"
import CategoryVideohryIcon from "@/assets/category-icons/videohry.svg?react"
import CategoryVodniSportyIcon from "@/assets/category-icons/vodni-sporty.svg?react"
import CategoryZimniSportyIcon from "@/assets/category-icons/zimni-sporty.svg?react"
import { cn } from "@/lib/utils"

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>

/** The 16 sport and game activities with their own icon, from Figma "Ikony aktivit (Ikona)". */
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

/** Main categories of activities (ADR-0019), keyed like `ActivityCategory.icon`. */
export const CATEGORIES = {
  "micove-sporty": { Icon: CategoryMicoveSportyIcon },
  "raketove-sporty": { Icon: CategoryRaketoveSportyIcon },
  presnost: { Icon: CategoryPresnostIcon },
  "zimni-sporty": { Icon: CategoryZimniSportyIcon },
  tanec: { Icon: CategoryTanecIcon },
  fitness: { Icon: CategoryFitnessIcon },
  "beh-a-kolo": { Icon: CategoryBehAKoloIcon },
  outdoor: { Icon: CategoryOutdoorIcon },
  "vodni-sporty": { Icon: CategoryVodniSportyIcon },
  "bojove-sporty": { Icon: CategoryBojoveSportyIcon },
  "deskove-a-karetni-hry": { Icon: CategoryDeskoveAKaretniHryIcon },
  videohry: { Icon: CategoryVideohryIcon },
  "kvizy-a-terenni-hry": { Icon: CategoryKvizyATerenniHryIcon },
  ostatni: { Icon: OstatniIcon },
} satisfies Record<string, { Icon: SvgComponent }>

export type ActivityCategoryKey = keyof typeof CATEGORIES

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as ActivityCategoryKey[]

/** Category keys come from the API as plain strings; unknown ones get no icon. */
export const isCategoryKey = (key: string): key is ActivityCategoryKey =>
  Object.hasOwn(CATEGORIES, key)

/**
 * Activities without their own drawing, by category: they show the category's
 * icon. Keys match `Activity.icon` in migration 20261108120000_kategorie_aktivit.
 */
const SHARED_ICON_ACTIVITIES = {
  "micove-sporty": [
    "futsal",
    "beach-volejbal",
    "hazena",
    "nohejbal",
    "ragby",
    "baseball",
    "ultimate-frisbee",
  ],
  "raketove-sporty": ["squash", "padel", "pickleball", "speedminton"],
  presnost: [
    "lukostrelba",
    "sportovni-strelba",
    "sipky",
    "bowling",
    "kuzelky",
    "golf",
    "discgolf",
    "petanque",
    "kulecnik",
    "curling",
  ],
  "zimni-sporty": [
    "krasobrusleni",
    "brusleni",
    "ledni-hokej",
    "lyzovani",
    "snowboarding",
    "bezky",
    "skialpinismus",
  ],
  tanec: ["salsa", "bachata", "swing", "standardni-tance", "street-dance", "zumba", "lidove-tance"],
  fitness: ["posilovna", "joga", "pilates", "crossfit", "kalistenika", "kruhovy-trenink"],
  "beh-a-kolo": ["horska-kola", "inline-brusleni", "triatlon", "nordic-walking"],
  outdoor: ["lezeni", "horolezectvi", "orientacni-beh", "geocaching", "kempovani"],
  "vodni-sporty": ["paddleboard", "vodactvi", "veslovani", "potapeni", "wakeboard", "vodni-polo"],
  "bojove-sporty": ["box", "judo", "karate", "jiu-jitsu", "thajsky-box", "serm", "krav-maga"],
  "deskove-a-karetni-hry": ["go", "karetni-hry", "marias", "bridz", "stolni-rpg", "wargaming"],
  videohry: [
    "konzolove-hry",
    "tymove-esporty",
    "strategie",
    "vr-hry",
    "zavodni-simulatory",
    "retro-hrani",
  ],
  "kvizy-a-terenni-hry": [
    "pub-kviz",
    "unikove-hry",
    "sifrovacky",
    "laser-game",
    "paintball",
    "airsoft",
    "larp",
  ],
} as const satisfies Partial<Record<ActivityCategoryKey, readonly string[]>>

type SharedIconActivity =
  (typeof SHARED_ICON_ACTIVITIES)[keyof typeof SHARED_ICON_ACTIVITIES][number]

const CATEGORY_OF_SHARED = new Map<string, ActivityCategoryKey>(
  Object.entries(SHARED_ICON_ACTIVITIES).flatMap(([category, keys]) =>
    keys.map((key) => [key, category as ActivityCategoryKey] as const),
  ),
)

/** Every activity the app knows: a translated name and an icon. */
export type Activity = keyof typeof ACTIVITIES | SharedIconActivity

/** Activities with their own drawing (and their own profile cover). */
export const ACTIVITY_KEYS = Object.keys(ACTIVITIES) as (keyof typeof ACTIVITIES)[]

/** Every known activity key, own drawing or not. */
export const ALL_ACTIVITY_KEYS = [...ACTIVITY_KEYS, ...CATEGORY_OF_SHARED.keys()] as Activity[]

/** Icon keys come from the API as plain strings; not every one is known. */
export const isActivityKey = (key: string): key is Activity =>
  Object.hasOwn(ACTIVITIES, key) || CATEGORY_OF_SHARED.has(key)

// One static lookup over all of them, so the icon is read, not built, per render.
const ICONS = Object.fromEntries([
  ...Object.entries(ACTIVITIES),
  ...[...CATEGORY_OF_SHARED].map(([key, category]) => [key, CATEGORIES[category]] as const),
]) as Record<Activity, { Icon: SvgComponent }>

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
  const { Icon } = ICONS[activity]

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

type CategoryIconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  category: ActivityCategoryKey
  /** Pass when the icon carries meaning on its own; otherwise it is decorative. */
  label?: string
}

/** Icon of a main category of activities, drawn like `ActivityIcon`. */
export function CategoryIcon({ category, label, className, ...props }: CategoryIconProps) {
  const { Icon } = CATEGORIES[category]

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
