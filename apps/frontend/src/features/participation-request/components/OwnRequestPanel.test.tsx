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

  // #153: the organizer's words with the decision.
  it.each(["approved", "rejected"] as const)(
    "quotes the organizer's message on a %s request",
    (view) => {
      render(
        <OwnRequestPanel
          view={view}
          approvalMode="MANUAL"
          onWithdraw={vi.fn()}
          decisionMessage="Vezmi si sálovky."
        />,
      )

      expect(screen.getByText("Zpráva od organizátora")).toBeInTheDocument()
      expect(screen.getByText("Vezmi si sálovky.")).toBeInTheDocument()
    },
  )

  it("shows no message block without a message", () => {
    renderPanel("approved")

    expect(screen.queryByText("Zpráva od organizátora")).not.toBeInTheDocument()
  })

  // F-06.4.
  it("offers to cancel a seat and says the rule", async () => {
    const onCancel = vi.fn()
    render(
      <OwnRequestPanel
        view="approved"
        approvalMode="MANUAL"
        onWithdraw={vi.fn()}
        onCancel={onCancel}
      />,
    )

    expect(
      screen.getByText(
        "Účast můžeš zrušit kdykoli před začátkem akce, organizátorovi napíšeš proč.",
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit účast" }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("shows a cancelled seat with the way to ask again", () => {
    render(
      <OwnRequestPanel
        view="cancelled"
        approvalMode="MANUAL"
        onWithdraw={vi.fn()}
        rejoinAction={<button type="button">Požádat o účast</button>}
      />,
    )

    expect(screen.getByText("Odhlášeno")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Účast na této akci jsi zrušil. Pokud si to rozmyslíš, můžeš o účast požádat znovu.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Požádat o účast" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zrušit účast" })).not.toBeInTheDocument()
  })
})
