import { HTTPError } from "ky"
import { describe, expect, it } from "vitest"

import { privateDetailsErrorsOf } from "@/features/profile/lib/privateDetailsErrors"

const refused = (status: number, data: unknown) =>
  Object.assign(
    new HTTPError(
      new Response("{}", { status }),
      new Request("http://x/api/profile/private"),
      {} as never,
    ),
    { data },
  )

describe("privateDetailsErrorsOf", () => {
  it.each([
    ["UNDERAGE", "birthYear", "auth.validation.underage"],
    ["INVALID_BIRTH_YEAR", "birthYear", "auth.validation.birthYearInvalid"],
    ["INVALID_GENDER", "gender", "auth.validation.genderRequired"],
  ])("puts %s under the field it is about", (code, field, message) => {
    expect(privateDetailsErrorsOf(refused(400, { message: [code] }))).toEqual([{ field, message }])
  })

  it("reads every code the server sent", () => {
    expect(
      privateDetailsErrorsOf(refused(400, { message: ["INVALID_GENDER", "UNDERAGE"] })),
    ).toHaveLength(2)
  })

  it.each([
    ["a server error", refused(500, { message: ["UNDERAGE"] })],
    ["another refusal", refused(400, { message: ["friendsSeeEventHistory must be a boolean"] })],
    ["a body without a message", refused(400, undefined)],
    ["no connection", new TypeError("Failed to fetch")],
  ])("finds no field for %s", (_case, error) => {
    expect(privateDetailsErrorsOf(error)).toEqual([])
  })
})
