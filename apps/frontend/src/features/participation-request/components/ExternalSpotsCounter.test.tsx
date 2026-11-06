import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ExternalSpotsRefusedError } from "@/features/participation-request/api/updateExternalSpots"
import { ExternalSpotsCounter } from "@/features/participation-request/components/ExternalSpotsCounter"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

const { updateExternalSpots, toast } = vi.hoisted(() => ({
  updateExternalSpots: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/participation-request/api/updateExternalSpots", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateExternalSpots,
}))
vi.mock("sonner", () => ({ toast }))

const anEvent = (overrides: Partial<ManagedEventOverview> = {}): ManagedEventOverview => ({
  id: "e1",
  title: "Čtvrteční florbal",
  when: "Dnes 19:00",
  status: "PUBLISHED",
  startAt: new Date(2030, 0, 1, 19, 0),
  endAt: new Date(2030, 0, 1, 20, 30),
  approvalMode: "MANUAL",
  taken: 7,
  min: 8,
  max: 10,
  approved: 5,
  externalOccupied: 2,
  fillState: "BELOW_MINIMUM",
  ...overrides,
})

beforeEach(() => {
  updateExternalSpots.mockReset()
  toast.error.mockReset()
})

const renderCounter = (
  props: {
    event?: ManagedEventOverview
    isLocked?: boolean
    onChange?: () => Promise<unknown>
  } = {},
) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <ExternalSpotsCounter
        event={props.event ?? anEvent()}
        isLocked={props.isLocked ?? false}
        onChange={props.onChange}
      />
    </QueryClientProvider>,
  )

const more = () => screen.getByRole("button", { name: "Místa mimo aplikaci: více" })

describe("ExternalSpotsCounter", () => {
  it("saves several clicks as one change and refreshes the event", async () => {
    updateExternalSpots.mockResolvedValue(undefined)
    const onChange = vi.fn().mockResolvedValue(undefined)
    renderCounter({ onChange })

    await userEvent.click(more())
    await userEvent.click(more())

    expect(screen.getByRole("textbox")).toHaveValue("4")
    await waitFor(() => expect(updateExternalSpots).toHaveBeenCalledWith("e1", 4))
    expect(updateExternalSpots).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onChange).toHaveBeenCalled())
  })

  it("never offers more than the approved participants leave free", () => {
    renderCounter({ event: anEvent({ max: 10, approved: 5, externalOccupied: 5 }) })

    expect(more()).toBeDisabled()
  })

  it("says why a save was refused and goes back to the saved number", async () => {
    updateExternalSpots.mockRejectedValue(new ExternalSpotsRefusedError(["MAX_BELOW_OCCUPIED"]))
    const onChange = vi.fn().mockResolvedValue(undefined)
    renderCounter({ onChange })

    await userEvent.click(more())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Tolik míst už volných není, mezitím se někdo přihlásil.",
      ),
    )
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByRole("textbox")).toHaveValue("2")
  })

  it("only shows the number once the event has started", () => {
    renderCounter({ isLocked: true })

    expect(
      screen.getByText("Mimo aplikaci: 2 místa. Po začátku akce už počet nejde měnit."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
