import type { ReactNode } from "react"
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupCard } from "@/features/group/components/GroupCard"
import { GroupGrid } from "@/features/group/components/GroupGrid"

const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: "g1",
  name: "Čtvrteční florbalisté",
  description: "Hrajeme každý čtvrtek.",
  locationName: "Praha 8",
  usualSchedule: null,
  visibility: "PUBLIC",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  memberCount: 14,
  ...overrides,
})

const activityLabel = (activity: Group["activity"]) => activity.name.toLowerCase()

// Cards are router <Link>s, so they need a router around them.
const renderInRouter = (ui: ReactNode) => {
  const rootRoute = createRootRoute({ component: () => ui })
  render(<RouterProvider router={createRouter({ routeTree: rootRoute })} />)
}

describe("GroupCard", () => {
  it("links to the group and shows where, what and how many", async () => {
    renderInRouter(
      <GroupCard
        group={aGroup()}
        activityLabel={activityLabel}
        myRole="OWNER"
      />,
    )

    const link = await screen.findByRole("link", { name: /Čtvrteční florbalisté/ })
    expect(link).toHaveAttribute("href", "/groups/g1")
    expect(screen.getByText("Praha 8 · florbal · 14 členů")).toBeInTheDocument()
    expect(screen.getByText("Organizátor")).toBeInTheDocument()
  })

  it("shows the visibility of a group the viewer is not in", async () => {
    renderInRouter(
      <GroupCard
        group={aGroup({ locationName: null, memberCount: 1 })}
        activityLabel={activityLabel}
      />,
    )

    expect(await screen.findByText("florbal · 1 člen")).toBeInTheDocument()
    expect(screen.getByText("Veřejná")).toBeInTheDocument()
  })
})

describe("GroupGrid", () => {
  const props = {
    isPending: false,
    error: null,
    onRetry: vi.fn(),
    empty: "Nic tu není.",
    getKey: (group: Group) => group.id,
    renderItem: (group: Group) => group.name,
  }

  it("says what would appear when the list is empty", () => {
    render(
      <GroupGrid
        {...props}
        items={[]}
      />,
    )

    expect(screen.getByText("Nic tu není.")).toBeInTheDocument()
  })

  it("offers a retry when loading fails", async () => {
    const onRetry = vi.fn()
    render(
      <GroupGrid
        {...props}
        items={undefined}
        error={new Error("Server neodpovídá")}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Skupiny se nepodařilo načíst")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("lists the items", () => {
    render(
      <GroupGrid
        {...props}
        items={[aGroup(), aGroup({ id: "g2", name: "Deskovky Holešovice" })]}
      />,
    )

    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })
})
