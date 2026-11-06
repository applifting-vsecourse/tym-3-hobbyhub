import { thisWeekendRange, thisWeekRange } from "@/components/hobbyhub/filterDateRanges"

// 2026-11-02 is a Monday.
const day = (date: number) => new Date(Date.UTC(2026, 10, date, 11))

describe("Prague today", () => {
  it("is read in Prague, not in the zone of the device", () => {
    // 23:30 UTC on Saturday is already 00:30 on Sunday in Prague (winter time).
    const lateSaturday = new Date(Date.UTC(2026, 10, 7, 23, 30))
    expect(thisWeekRange(lateSaturday)).toEqual({ dateFrom: "2026-11-08", dateTo: "2026-11-08" })
  })
})

describe("thisWeekRange", () => {
  it("runs from today to the nearest Sunday", () => {
    expect(thisWeekRange(day(2))).toEqual({ dateFrom: "2026-11-02", dateTo: "2026-11-08" })
    expect(thisWeekRange(day(7))).toEqual({ dateFrom: "2026-11-07", dateTo: "2026-11-08" })
  })

  it("is only today on a Sunday", () => {
    expect(thisWeekRange(day(8))).toEqual({ dateFrom: "2026-11-08", dateTo: "2026-11-08" })
  })
})

describe("thisWeekendRange", () => {
  it("is the coming Saturday and Sunday on a weekday", () => {
    expect(thisWeekendRange(day(2))).toEqual({ dateFrom: "2026-11-07", dateTo: "2026-11-08" })
    expect(thisWeekendRange(day(6))).toEqual({ dateFrom: "2026-11-07", dateTo: "2026-11-08" })
  })

  it("starts today during the weekend", () => {
    expect(thisWeekendRange(day(7))).toEqual({ dateFrom: "2026-11-07", dateTo: "2026-11-08" })
    expect(thisWeekendRange(day(8))).toEqual({ dateFrom: "2026-11-08", dateTo: "2026-11-08" })
  })

  it("crosses a month end", () => {
    expect(thisWeekendRange(new Date(Date.UTC(2026, 9, 28, 11)))).toEqual({
      dateFrom: "2026-10-31",
      dateTo: "2026-11-01",
    })
  })
})
