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
    ...Array<SeatState>(taken).fill("taken"),
    ...Array<SeatState>(missing).fill("missing"),
    ...Array<SeatState>(free).fill("free"),
  ]
}

/** Czech one-line summary used as the accessible name of seat graphics. */
export function capacityLabel(capacity: Capacity) {
  const missing = missingCount(capacity)
  const base = `Obsazeno ${capacity.taken} z ${capacity.max ?? capacity.min}`
  return missing > 0 ? `${base}, chybí ${missing}` : `${base}, naplněno`
}
