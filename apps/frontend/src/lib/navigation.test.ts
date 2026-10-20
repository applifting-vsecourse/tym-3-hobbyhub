import { navSectionForPath } from "@/lib/navigation"

describe("navSectionForPath", () => {
  it.each([
    ["/events", "discover"],
    ["/events/abc-123", "discover"],
    ["/groups", "groups"],
    ["/groups/new", "groups"],
    ["/groups/abc-123", "groups"],
    ["/my-events", "my-events"],
    ["/profile", "profile"],
  ] as const)("%s highlights %s", (pathname, section) => {
    expect(navSectionForPath(pathname)).toBe(section)
  })

  it.each(["/", "/events/new", "/terms", "/login", "/eventsy"])(
    "%s highlights nothing",
    (pathname) => {
      expect(navSectionForPath(pathname)).toBeNull()
    },
  )
})
