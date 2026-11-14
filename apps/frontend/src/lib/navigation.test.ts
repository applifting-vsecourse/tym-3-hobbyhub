import { navSectionForPath } from "@/lib/navigation"

describe("navSectionForPath", () => {
  it.each([
    ["/events", "discover"],
    ["/events/abc-123", "discover"],
    ["/events/new", "add"],
    ["/groups", "groups"],
    ["/groups/new", "groups"],
    ["/groups/abc-123", "groups"],
    ["/my-events", "my-events"],
    ["/friends", "friends"],
  ] as const)("%s highlights %s", (pathname, section) => {
    expect(navSectionForPath(pathname)).toBe(section)
  })

  // Profil is in the avatar menu, not a section of the navigation (#227).
  it.each(["/", "/terms", "/login", "/eventsy", "/profile", "/profile/edit"])("%s highlights nothing", (pathname) => {
    expect(navSectionForPath(pathname)).toBeNull()
  })
})
