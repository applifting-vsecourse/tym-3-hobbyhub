import {
  reportSearchSchema,
  toReportFilter,
  toReportSearch,
} from "@/features/admin/lib/reportSearch"

// #240, #73: the queue's filter lives in the URL.
describe("the queue filter in the URL", () => {
  it("shows everyone's open reports from the first page without a search", () => {
    expect(toReportFilter(reportSearchSchema.parse({}))).toEqual({
      status: "OPEN",
      targetType: undefined,
      mine: false,
      offset: 0,
    })
  })

  it("falls back on anything odd", () => {
    expect(
      toReportFilter(
        reportSearchSchema.parse({ status: "CLOSED", target: "GROUP", mine: "yes", offset: -1 }),
      ),
    ).toEqual({ status: "OPEN", targetType: undefined, mine: false, offset: 0 })
  })

  it("keeps only what differs from the default, and reads it back the same", () => {
    const filter = { status: "RESOLVED", targetType: "USER", mine: true, offset: 20 } as const

    expect(toReportSearch(filter)).toEqual({
      status: "RESOLVED",
      target: "USER",
      mine: true,
      offset: 20,
    })
    expect(toReportFilter(toReportSearch(filter))).toEqual(filter)
    expect(toReportSearch({ status: "OPEN", mine: false, offset: 0 })).toEqual({
      status: undefined,
      target: undefined,
      mine: undefined,
      offset: undefined,
    })
  })
})
