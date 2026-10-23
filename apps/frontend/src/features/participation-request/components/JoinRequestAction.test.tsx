import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { MyRequestState } from "@/features/participation-request/api/participationRequestSchemas"
import { JoinRefusedError } from "@/features/participation-request/api/requestToJoin"
import { JoinRequestAction } from "@/features/participation-request/components/JoinRequestAction"

const { requestToJoin, toast } = vi.hoisted(() => ({
  requestToJoin: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("sonner", () => ({ toast }))
vi.mock("@/features/participation-request/api/requestToJoin", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestToJoin,
}))

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

beforeEach(() => {
  requestToJoin.mockReset()
  toast.success.mockReset()
})

const FREE: MyRequestState = { request: null, violations: [] }

const renderAction = (state: MyRequestState | undefined, onChange = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const withProviders = (ui: ReactNode) => (
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
  return renderWithRouter(
    withProviders(
      <JoinRequestAction
        eventId="e1"
        label="Požádat o účast"
        state={state}
        isLoading={false}
        onChange={onChange}
      />,
    ),
  )
}

const openSheet = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Požádat o účast" }))
  return screen.findByRole("dialog", { name: "Žádost o účast" })
}

describe("JoinRequestAction", () => {
  it("sends the request with a message and refreshes the page", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    requestToJoin.mockResolvedValue({
      id: "r1",
      eventId: "e1",
      status: "PENDING",
      message: "Hraju třetím rokem.",
      requestedAt: new Date(),
    })
    await renderAction(FREE, onChange)

    await openSheet()
    await userEvent.type(
      screen.getByLabelText("Zpráva organizátorovi (nepovinné)"),
      "  Hraju třetím rokem.  ",
    )
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost odeslána"))
    expect(requestToJoin.mock.calls[0]?.[0]).toEqual({
      eventId: "e1",
      message: "Hraju třetím rokem.",
    })
    expect(onChange).toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("sends a request without a message", async () => {
    requestToJoin.mockResolvedValue({
      id: "r1",
      eventId: "e1",
      status: "PENDING",
      message: null,
      requestedAt: new Date(),
    })
    await renderAction(FREE)

    await openSheet()
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost odeslána"))
    expect(requestToJoin.mock.calls[0]?.[0]).toEqual({ eventId: "e1", message: undefined })
  })

  it("stops a message over the limit before sending", async () => {
    await renderAction(FREE)

    await openSheet()
    const field = screen.getByLabelText("Zpráva organizátorovi (nepovinné)")
    await userEvent.click(field)
    await userEvent.paste("a".repeat(501))
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    expect(await screen.findByText("Zpráva může mít nejvýš 500 znaků.")).toBeInTheDocument()
    expect(requestToJoin).not.toHaveBeenCalled()
  })

  it("says why the server refused, e.g. the event filled up meanwhile", async () => {
    requestToJoin.mockRejectedValue(new JoinRefusedError(["EVENT_FULL"]))
    await renderAction(FREE)

    await openSheet()
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    expect(await screen.findByText("Akce je plná, o účast se nedá žádat.")).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("says the request already exists when another window sent it", async () => {
    requestToJoin.mockRejectedValue(new JoinRefusedError(["ALREADY_REQUESTED"]))
    await renderAction(FREE)

    await openSheet()
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    expect(await screen.findByText("O účast na této akci už žádáš.")).toBeInTheDocument()
  })

  it("explains a refusal next to an inactive button", async () => {
    await renderAction({ request: null, violations: ["EVENT_STARTED"] })

    expect(screen.getByRole("button", { name: "Požádat o účast" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Požádat o účast" })).toHaveAccessibleDescription(
      "Akce už začala, o účast se nedá žádat.",
    )
  })

  it("lets the person try when their state could not be loaded", async () => {
    await renderAction(undefined)

    expect(screen.getByRole("button", { name: "Požádat o účast" })).toBeEnabled()
  })
})
