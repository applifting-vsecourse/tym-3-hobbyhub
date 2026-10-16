import { capacityLabel, missingCount, seatStates } from "@/components/hobbyhub/capacity"
import { i18n } from "@/i18n"

describe("seatStates", () => {
  it("fills taken seats, then missing up to the minimum", () => {
    expect(seatStates({ taken: 7, min: 10 })).toEqual([
      ...Array<string>(7).fill("taken"),
      ...Array<string>(3).fill("missing"),
    ])
  })

  it("draws seats above the minimum as free", () => {
    expect(seatStates({ taken: 8, min: 10, max: 12 })).toEqual([
      ...Array<string>(8).fill("taken"),
      "missing",
      "missing",
      "free",
      "free",
    ])
  })

  it("never draws more seats than the capacity", () => {
    expect(seatStates({ taken: 12, min: 5 })).toEqual(Array(5).fill("taken"))
  })
})

describe("capacityLabel", () => {
  it("counts missing people towards the minimum", () => {
    expect(missingCount({ taken: 8, min: 10, max: 12 })).toBe(2)
    expect(capacityLabel(i18n.t, { taken: 8, min: 10, max: 12 })).toBe("Obsazeno 8 z 12, chybí 2")
  })

  it("says full when nobody is missing", () => {
    expect(capacityLabel(i18n.t, { taken: 5, min: 5 })).toBe("Obsazeno 5 z 5, naplněno")
  })
})
