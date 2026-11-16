import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GroupRow } from "@/components/hobbyhub/GroupRow"

describe("GroupRow", () => {
  it("shows the title, the details and what the viewer is to the group", () => {
    render(
      <GroupRow
        title="Čtvrteční florbalisté"
        subtitle="Praha 8 · florbal · 14 členů"
        activity="florbal"
        badge="Organizátor"
      />,
    )

    expect(screen.getByRole("heading", { name: "Čtvrteční florbalisté" })).toBeInTheDocument()
    expect(screen.getByText("Praha 8 · florbal · 14 členů")).toBeInTheDocument()
    expect(screen.getByText("Organizátor")).toBeInTheDocument()
  })

  it("draws no badge when there is none", () => {
    render(
      <GroupRow
        title="Šachy"
        subtitle="Brno"
      />,
    )

    expect(screen.queryByText("Organizátor")).not.toBeInTheDocument()
  })
})
