import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { CancelEventDialog } from "@/features/event/components/CancelEventDialog"

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const REASONS = [
  { id: "r1", name: "Nepříznivé počasí" },
  { id: "r2", name: "Nedostatek účastníků" },
]

const renderDialog = (props: Partial<Parameters<typeof CancelEventDialog>[0]> = {}) => {
  const onSubmit = vi.fn()
  render(
    <CancelEventDialog
      isOpen
      onOpenChange={vi.fn()}
      reasons={REASONS}
      isReasonsLoading={false}
      isReasonsError={false}
      onRetryReasons={vi.fn()}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe("CancelEventDialog", () => {
  it("does not cancel without a reason", async () => {
    const { onSubmit, user } = renderDialog()

    await user.click(screen.getByRole("button", { name: "Zrušit akci" }))

    expect(await screen.findByText("Vyberte důvod zrušení")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the chosen reason with the trimmed note", async () => {
    const { onSubmit, user } = renderDialog()

    await user.click(screen.getByRole("combobox", { name: "Důvod" }))
    await user.click(await screen.findByRole("option", { name: "Nepříznivé počasí" }))
    await user.type(screen.getByLabelText("Zpráva pro účastníky (nepovinné)"), "  Hala je zavřená ")
    await user.click(screen.getByRole("button", { name: "Zrušit akci" }))

    expect(onSubmit).toHaveBeenCalledWith({
      cancellationReasonId: "r1",
      cancellationNote: "Hala je zavřená",
    })
  })

  it("leaves the note out when it is empty", async () => {
    const { onSubmit, user } = renderDialog()

    await user.click(screen.getByRole("combobox", { name: "Důvod" }))
    await user.click(await screen.findByRole("option", { name: "Nedostatek účastníků" }))
    await user.click(screen.getByRole("button", { name: "Zrušit akci" }))

    expect(onSubmit).toHaveBeenCalledWith({
      cancellationReasonId: "r2",
      cancellationNote: undefined,
    })
  })

  it("refuses a note over 500 characters", async () => {
    const { onSubmit, user } = renderDialog()

    await user.click(screen.getByRole("combobox", { name: "Důvod" }))
    await user.click(await screen.findByRole("option", { name: "Nepříznivé počasí" }))
    await user.click(screen.getByLabelText("Zpráva pro účastníky (nepovinné)"))
    await user.paste("x".repeat(501))
    await user.click(screen.getByRole("button", { name: "Zrušit akci" }))

    expect(await screen.findByText("Maximálně 500 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows why the cancellation failed", () => {
    renderDialog({ errorMessage: "Akci se nepodařilo zrušit. Zkuste to prosím znovu." })

    expect(
      screen.getByText("Akci se nepodařilo zrušit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
  })
})
