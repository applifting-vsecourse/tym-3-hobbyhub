import badminton from "@/assets/covers/badminton.svg"
import basketbal from "@/assets/covers/basketbal.svg"
import beh from "@/assets/covers/beh.svg"
import cviceni from "@/assets/covers/cviceni.svg"
import cyklistika from "@/assets/covers/cyklistika.svg"
import deskoveHry from "@/assets/covers/deskove-hry.svg"
import florbal from "@/assets/covers/florbal.svg"
import fotbal from "@/assets/covers/fotbal.svg"
import hryDoma from "@/assets/covers/hry-doma.svg"
import konfety from "@/assets/covers/konfety.svg"
import lanParty from "@/assets/covers/lan-party.svg"
import ostatni from "@/assets/covers/ostatni.svg"
import plavani from "@/assets/covers/plavani.svg"
import roster from "@/assets/covers/roster.svg"
import sachy from "@/assets/covers/sachy.svg"
import sedadla from "@/assets/covers/sedadla.svg"
import stolniTenis from "@/assets/covers/stolni-tenis.svg"
import tenis from "@/assets/covers/tenis.svg"
import turistika from "@/assets/covers/turistika.svg"
import tymove from "@/assets/covers/tymove.svg"
import venku from "@/assets/covers/venku.svg"
import volejbal from "@/assets/covers/volejbal.svg"
import volna from "@/assets/covers/volna.svg"
import vsechno from "@/assets/covers/vsechno.svg"

/**
 * The pictures on top of a profile, drawn like the illustrated avatars: one for
 * every sport the app knows (named by its icon key), a few mixed ones and two
 * made of seats and people. 720 × 160, cropped to the width of the page.
 */
export const COVERS = {
  florbal: florbal,
  volejbal: volejbal,
  tenis: tenis,
  fotbal: fotbal,
  basketbal: basketbal,
  beh: beh,
  cyklistika: cyklistika,
  plavani: plavani,
  "stolni-tenis": stolniTenis,
  badminton: badminton,
  "deskove-hry": deskoveHry,
  sachy: sachy,
  "lan-party": lanParty,
  turistika: turistika,
  ostatni: ostatni,
  cviceni: cviceni,
  tymove: tymove,
  venku: venku,
  "hry-doma": hryDoma,
  vsechno: vsechno,
  roster: roster,
  sedadla: sedadla,
  volna: volna,
  konfety: konfety,
} as const

export type CoverId = keyof typeof COVERS

export const COVER_IDS = Object.keys(COVERS) as CoverId[]

export const isCoverId = (id: string): id is CoverId => Object.hasOwn(COVERS, id)

/** With no choice made, the profile wears the cover of the first sport, or the people. */
export const defaultCoverId = (firstActivityIcon: string | undefined): CoverId =>
  firstActivityIcon && isCoverId(firstActivityIcon) ? firstActivityIcon : "roster"

/** An uploaded picture is kept as a WebP data URL instead of an id. */
export const isOwnCover = (cover: string | null | undefined): cover is string =>
  Boolean(cover?.startsWith("data:image/"))

/** What to put in `src`: the person's own picture, the chosen cover, or the default. */
export const coverSrc = (
  chosen: string | null | undefined,
  firstActivityIcon: string | undefined,
): string =>
  isOwnCover(chosen)
    ? chosen
    : COVERS[chosen && isCoverId(chosen) ? chosen : defaultCoverId(firstActivityIcon)]
