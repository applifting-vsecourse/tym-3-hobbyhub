import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { ApprovalMode } from "@/features/participation-request/api/participationRequestSchemas"
import { OwnRequestPanel } from "@/features/participation-request/components/OwnRequestPanel"
import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

const renderPanel = (
  view: Exclude<OwnSeatView, "organizer">,
  onWithdraw = vi.fn(),
  approvalMode: ApprovalMode = "MANUAL",
) =>
  render(
    <OwnRequestPanel
      view={view}
      approvalMode={approvalMode}
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

  it.each([
    ["MANUAL", "Organizátor tvou účast schválil."],
    ["AUTOMATIC", "Na akci máš místo."],
  ] as const)("shows a seat on an event approved %s", (approvalMode, text) => {
    renderPanel("approved", vi.fn(), approvalMode)

    expect(screen.getByText("Schváleno")).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
