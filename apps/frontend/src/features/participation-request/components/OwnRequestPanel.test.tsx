import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OwnRequestPanel } from "@/features/participation-request/components/OwnRequestPanel"
import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

const { withdrawRequest, toast } = vi.hoisted(() => ({
  withdrawRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("sonner", () => ({ toast }))
vi.mock("@/features/participation-request/api/withdrawRequest", () => ({ withdrawRequest }))

beforeEach(() => {
  withdrawRequest.mockReset()
})

const renderPanel = (view: OwnSeatView, onChange = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OwnRequestPanel
        eventId="e1"
        view={view}
        onChange={onChange}
      />
    </QueryClientProvider>,
  )

describe("OwnRequestPanel", () => {
  it("withdraws a pending request only after confirming", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    withdrawRequest.mockResolvedValue(undefined)
    renderPanel("pending", onChange)

    expect(screen.getByText("Čeká na schválení")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zrušit žádost" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Zrušit žádost o účast?" })
    expect(withdrawRequest).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zrušena"))
    expect(withdrawRequest.mock.calls[0]?.[0]).toBe("e1")
    expect(onChange).toHaveBeenCalled()
  })

  it("keeps the request when the person changes their mind", async () => {
    renderPanel("pending")

    await userEvent.click(screen.getByRole("button", { name: "Zrušit žádost" }))
    await userEvent.click(await screen.findByRole("button", { name: "Ponechat" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(withdrawRequest).not.toHaveBeenCalled()
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
