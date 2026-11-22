import type { TFunction } from "i18next"

import type { SeatState } from "@/components/hobbyhub/Seat"

export type Capacity = {
  taken: number
  /** People needed for the event to happen. "Missing" always counts towards this. */
  min: number
  /** Optional cap above the minimum; defaults to the minimum. */
  max?: number
}

/** How many seats are still missing to reach the minimum. */
export function missingCount({ taken, min }: Capacity) {
  return Math.max(min - taken, 0)
}

/** Seat states in display order: taken, then missing up to the minimum, then free. */
export function seatStates(capacity: Capacity): SeatState[] {
  const max = Math.max(capacity.max ?? capacity.min, capacity.min)
  const taken = Math.min(Math.max(capacity.taken, 0), max)
  const missing = missingCount({ ...capacity, taken })
  const free = max - taken - missing

  return [
    ...new Array<SeatState>(taken).fill("taken"),
    ...new Array<SeatState>(missing).fill("missing"),
    ...new Array<SeatState>(free).fill("free"),
  ]
}

/** One-line summary used as the accessible name of seat graphics. */
export function capacityLabel(t: TFunction, capacity: Capacity) {
  const missing = missingCount(capacity)
  const values = { taken: capacity.taken, total: capacity.max ?? capacity.min }
  return missing > 0
    ? t("hobbyhub.capacity.summaryMissing", { ...values, count: missing })
    : t("hobbyhub.capacity.summaryFull", values)
}

/** #215: from this many free seats a card just says "Volno". */
export const PLENTY_OF_FREE_SEATS = 4

/** #215: a roster with more seats than this is summed up, not drawn seat by seat. */
export const ROSTER_SUMMARY_ABOVE = 6

/** Seats still free up to the cap, the number an attendee cares about (#215). */
export function freeCount({ taken, max }: { taken: number; max: number }) {
  return Math.max(max - taken, 0)
}
