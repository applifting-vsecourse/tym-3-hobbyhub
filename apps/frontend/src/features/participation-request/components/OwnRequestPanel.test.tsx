import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OwnRequestPanel } from "@/features/participation-request/components/OwnRequestPanel"
import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

const renderPanel = (view: OwnSeatView, onWithdraw = vi.fn()) =>
  render(
    <OwnRequestPanel
      view={view}
      onWithdraw={onWithdraw}
    />,
  )

describe("OwnRequestPanel", () => {
  it("shows a pending request and offers to withdraw it", async () => {
    const onWithdraw = vi.fn()
    renderPanel("pending", onWithdraw)

    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Na tuto akci jsi podal žádost o účast. Organizátor ji zatím nevyřídil. Dokud čeká, můžeš ji zrušit.",
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit žádost" }))

    expect(onWithdraw).toHaveBeenCalledOnce()
  })

  it("tells a rejected applicant they cannot ask again", () => {
    renderPanel("rejected")

    expect(screen.getByText("Zamítnuto")).toBeInTheDocument()
    expect(
      screen.getByText("Organizátor tvou žádost zamítl, novou na tuto akci poslat nemůžeš."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("tells the organizer it is their event", () => {
    renderPanel("organizer")

    expect(screen.getByText("Tuto akci pořádáš.")).toBeInTheDocument()
  })
})
