import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventModerationRefusedError } from "@/features/admin/api/eventModerationMutations"
import { HideEventSheet } from "@/features/admin/components/HideEventSheet"

const renderSheet = (props: { error?: unknown; onSubmit?: () => Promise<unknown> } = {}) =>
  renderWithRouter(
    <HideEventSheet
      isOpen
      onOpenChange={() => undefined}
      title="Čtvrteční florbal"
      isPending={false}
      error={props.error ?? null}
      onSubmit={props.onSubmit ?? (() => Promise.resolve())}
    />,
  )

describe("HideEventSheet (#239)", () => {
  it("sends the trimmed reason", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => Promise.resolve())
    await renderSheet({ onSubmit })

    await user.type(screen.getByLabelText("Důvod skrytí"), "  Nabízí placené služby.  ")
    await user.click(screen.getByRole("button", { name: "Skrýt akci" }))

    expect(onSubmit).toHaveBeenCalledWith({ reason: "Nabízí placené služby." })
  })

  it("asks for a reason of at least 10 characters", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => Promise.resolve())
    await renderSheet({ onSubmit })

    await user.type(screen.getByLabelText("Důvod skrytí"), "Spam")
    await user.click(screen.getByRole("button", { name: "Skrýt akci" }))

    expect(await screen.findByText("Napište důvod, aspoň 10 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("says when another administrator was faster", async () => {
    await renderSheet({ error: new EventModerationRefusedError(["EVENT_ALREADY_HIDDEN"]) })

    expect(
      screen.getByText("Akci mezitím změnil jiný správce. Údaje níže jsou aktuální."),
    ).toBeInTheDocument()
  })
})
