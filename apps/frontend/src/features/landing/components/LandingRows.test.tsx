import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Landing, LandingEvent, LandingRow } from "@/features/landing/api/landingSchemas"
import { LandingRows } from "@/features/landing/components/LandingRows"

// Thursday 19 Nov 2026, 16:00 in Prague.
const NOW = new Date("2026-11-19T15:00:00Z")

const anEvent = (id: string, override: Partial<LandingEvent> = {}): LandingEvent => ({
  id,
  title: `Akce ${id}`,
  imageUrl: null,
  startAt: new Date("2026-11-19T17:30:00Z"),
  venueType: "PLACE",
  placeName: "Hala Letná",
  district: "Praha 7",
  city: "Praha",
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 4,
  maxParticipants: 6,
  takenCount: 3,
  organizerName: "hokejka_tom",
  viewerState: null,
  friends: [],
  organizerScore: null,
  ...override,
})

const row = (kind: LandingRow["kind"], override: Partial<LandingRow> = {}): LandingRow => ({
  kind,
  status: "ok",
  events: [anEvent(`${kind}-1`)],
  groups: [],
  ...override,
})

const landing = (rows: LandingRow[], override: Partial<Landing> = {}): Landing => ({
  rows,
  near: { mode: "city", radiusKm: null, city: "Praha", latitude: null, longitude: null },
  cities: [
    { city: "Praha", eventCount: 12 },
    { city: "Brno", eventCount: 4 },
  ],
  interestActivityIds: [],
  ...override,
})

const trending = row("trendingGroups", {
  events: [],
  groups: [
    {
      id: "g1",
      name: "Florbal Letná",
      locationName: "Praha 7",
      usualSchedule: "Středy 19:00",
      activity: { id: "a1", name: "Florbal", icon: "florbal" },
      memberCount: 24,
      recentMemberCount: 6,
    },
  ],
})

const render = (
  data: Landing | undefined,
  props: Partial<Parameters<typeof LandingRows>[0]> = {},
) =>
  renderWithRouter(
    <LandingRows
      landing={data}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      isSignedIn={false}
      onCityChange={vi.fn()}
      activityLabel={(activity) => activity.name}
      now={NOW}
      {...props}
    />,
  )

const headings = () =>
  screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)

describe("LandingRows (#215)", () => {
  it("puts How it works after Top akce and the invitation to groups after Trendy skupiny", async () => {
    await render(
      landing([row("lastMinute"), row("top"), row("near"), trending, row("today"), row("weekend")]),
    )

    expect(headings()).toEqual([
      "Last minute",
      "Top akce",
      "Jak to funguje",
      "Ve tvém okolí",
      "Trendy skupiny",
      "Hraješ pravidelně? Najdi si skupinu",
      "Dnes",
      "Tento víkend",
    ])
  })

  it("does not invite a signed-in person to groups", async () => {
    await render(landing([row("lastMinute"), row("top"), trending]), { isSignedIn: true })

    expect(headings()).not.toContain("Hraješ pravidelně? Najdi si skupinu")
  })

  it("links each row to the event list with the same filter", async () => {
    await render(
      landing([row("lastMinute"), row("top"), row("today"), row("liked")], {
        interestActivityIds: ["a1", "a2"],
      }),
    )

    const linksTo = (name: string) =>
      screen.getAllByRole("link", { name }).map((link) => link.getAttribute("href"))
    expect(linksTo("Všechny last minute")[0]).toBe("/events?soon=true")
    expect(linksTo("Všechny dnešní akce")[0]).toBe("/events?from=2026-11-19&to=2026-11-19")
    expect(linksTo("Akce mých aktivit")[0]).toContain("activity=")
    // "Top akce" has no list of its own.
    expect(screen.queryByRole("link", { name: /Všechny top/ })).not.toBeInTheDocument()
  })

  it("lets a visitor pick the city of Ve tvém okolí", async () => {
    const onCityChange = vi.fn()
    await render(landing([row("near")]), { onCityChange })

    const picker = screen.getByRole("combobox", { name: "Akce ve městě" })
    expect(picker).toHaveTextContent("Praha")
    await userEvent.click(picker)
    await userEvent.click(await screen.findByRole("option", { name: /Brno/ }))

    expect(onCityChange).toHaveBeenCalledWith("Brno")
  })

  it("says how far from home a signed-in person's Ve tvém okolí reaches", async () => {
    await render(
      landing([row("near")], {
        near: { mode: "radius", radiusKm: 10, city: "Brno", latitude: 49.19, longitude: 16.6 },
        cities: [],
      }),
      { isSignedIn: true },
    )

    expect(screen.getByText("Do 10 km od domova")).toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })

  it("keeps the other rows when one failed, and offers to try again", async () => {
    const onRetry = vi.fn()
    await render(landing([row("lastMinute", { status: "error", events: [] }), row("top")]), {
      onRetry,
    })

    const failed = screen.getByRole("heading", { name: "Last minute" }).closest("section")!
    expect(within(failed).getByText("Tuhle řadu se nepodařilo načíst.")).toBeInTheDocument()
    await userEvent.click(within(failed).getByRole("button", { name: /Zkusit znovu|Načíst znovu/ }))
    expect(onRetry).toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Top akce" })).toBeInTheDocument()
  })

  it("says so when there is nothing, and still explains how it works", async () => {
    await render(landing([]))

    expect(screen.getByText(/Zatím tu žádné akce s volným místem nejsou/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Jak to funguje" })).toBeInTheDocument()
  })

  it("shows the friends going and the viewer's own state on a card", async () => {
    await render(
      landing([
        row("friends", {
          events: [
            anEvent("f1", {
              viewerState: "PENDING",
              friends: [{ id: "u1", name: "anna_k", image: null }],
            }),
          ],
        }),
      ]),
      { isSignedIn: true },
    )

    expect(screen.getByText("anna_k jde")).toBeInTheDocument()
    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
  })
})
