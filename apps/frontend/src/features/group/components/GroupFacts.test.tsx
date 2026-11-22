import { render, screen } from "@testing-library/react"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupFacts } from "@/features/group/components/GroupFacts"

// The map needs WebGL, which jsdom has not.
vi.mock("@/features/group/components/GroupsMap", () => ({ GroupsMap: () => null }))

const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: "g1",
  name: "Florbal",
  description: "Hrajeme.",
  locationName: "Praha 8",
  usualSchedule: null,
  tagline: null,
  visibility: "PUBLIC",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  memberCount: 5,
  isActive: false,
  approvalMode: "OPEN",
  meetingDays: [],
  latitude: 50.1,
  longitude: 14.4,
  nextEvent: null,
  ...overrides,
})

describe("GroupFacts", () => {
  it("shows where the group meets, and when only if it said so", () => {
    render(<GroupFacts group={aGroup()} />)

    expect(screen.getByText("Praha 8")).toBeInTheDocument()
    expect(screen.queryByText("Kdy")).not.toBeInTheDocument()
  })

  it("shows the days and the hours the group gave", () => {
    render(<GroupFacts group={aGroup({ meetingDays: [4], usualSchedule: "19:00 až 21:00" })} />)

    expect(screen.getByText("Kdy")).toBeInTheDocument()
    expect(screen.getByText("Každý čtvrtek, 19:00 až 21:00")).toBeInTheDocument()
  })
})
