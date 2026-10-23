import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { JoinRefusedError } from "@/features/participation-request/api/requestToJoin"
import {
  ParticipationRequestSheet,
  type RequestSheetStep,
} from "@/features/participation-request/components/ParticipationRequestSheet"

const { requestToJoin, withdrawRequest, toast } = vi.hoisted(() => ({
  requestToJoin: vi.fn(),
  withdrawRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/participation-request/api/requestToJoin", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestToJoin,
}))
vi.mock("@/features/participation-request/api/withdrawRequest", () => ({ withdrawRequest }))
vi.mock("sonner", () => ({ toast }))

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
  withdrawRequest.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
})

const pending = {
  id: "r1",
  eventId: "e1",
  status: "PENDING" as const,
  message: null,
  requestedAt: new Date(),
}

// The page owns the step; this stands in for it.
function Page({ initialStep }: { initialStep: RequestSheetStep | null }) {
  const [step, setStep] = useState(initialStep)
  return (
    <>
      <p>krok: {step ?? "zavřeno"}</p>
      <ParticipationRequestSheet
        eventId="e1"
        event={{
          title: "Čtvrteční florbal",
          time: "19:00",
          place: "ZŠ Kobylisy, Praha 8, Pokročilí",
          taken: 7,
          min: 8,
          max: 10,
        }}
        applicant={{ name: "Deep Duck Thoughts", isEmailVerified: true }}
        step={step}
        onStepChange={setStep}
      />
    </>
  )
}

const renderSheet = (initialStep: RequestSheetStep | null) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <Page initialStep={initialStep} />
    </QueryClientProvider>,
  )

describe("ParticipationRequestSheet", () => {
  it("shows the event and what the organizer will see", async () => {
    await renderSheet("form")

    const dialog = await screen.findByRole("dialog", { name: "Požádat o účast" })
    expect(within(dialog).getByText("Čtvrteční florbal")).toBeInTheDocument()
    expect(within(dialog).getByText("ZŠ Kobylisy, Praha 8, Pokročilí")).toBeInTheDocument()
    expect(within(dialog).getByText("Organizátor uvidí")).toBeInTheDocument()
    expect(within(dialog).getByText("Deep Duck Thoughts")).toBeInTheDocument()
    expect(within(dialog).getByText("E-mail ověřen · základní profil")).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Organizátor žádost schválí ručně. Zrušit ji můžeš, dokud ji nevyřídí.",
      ),
    ).toBeInTheDocument()
  })

  it("sends the trimmed message and shows the request as sent", async () => {
    requestToJoin.mockResolvedValue({ ...pending, message: "Hraju třetím rokem." })
    await renderSheet("form")

    await userEvent.type(
      await screen.findByLabelText("Zpráva organizátorovi (nepovinné)"),
      "  Hraju třetím rokem.  ",
    )
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    const sent = await screen.findByRole("dialog", { name: "Žádost je odeslaná" })
    expect(requestToJoin.mock.calls[0]?.[0]).toEqual({
      eventId: "e1",
      message: "Hraju třetím rokem.",
    })
    expect(within(sent).getByText("Čeká na schválení")).toBeInTheDocument()
    expect(within(sent).getByRole("link", { name: "Najít další akce" })).toHaveAttribute(
      "href",
      "/events",
    )
  })

  it("sends a request without a message", async () => {
    requestToJoin.mockResolvedValue(pending)
    await renderSheet("form")

    await userEvent.click(await screen.findByRole("button", { name: "Odeslat žádost" }))

    await screen.findByRole("dialog", { name: "Žádost je odeslaná" })
    expect(requestToJoin.mock.calls[0]?.[0]).toEqual({ eventId: "e1", message: undefined })
  })

  it("stops a message over the limit before sending", async () => {
    await renderSheet("form")

    await userEvent.click(await screen.findByLabelText("Zpráva organizátorovi (nepovinné)"))
    await userEvent.paste("a".repeat(501))
    await userEvent.click(screen.getByRole("button", { name: "Odeslat žádost" }))

    expect(await screen.findByText("Zpráva může mít nejvýš 500 znaků.")).toBeInTheDocument()
    expect(requestToJoin).not.toHaveBeenCalled()
  })

  it.each([
    ["EVENT_FULL", "Akce je plná, o účast se nedá žádat."],
    ["ALREADY_REQUESTED", "O účast na této akci už žádáš."],
  ] as const)("says why the server refused with %s", async (violation, text) => {
    requestToJoin.mockRejectedValue(new JoinRefusedError([violation]))
    await renderSheet("form")

    await userEvent.click(await screen.findByRole("button", { name: "Odeslat žádost" }))

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.getByRole("dialog", { name: "Požádat o účast" })).toBeInTheDocument()
  })

  it("withdraws the request from the sent step only after confirming", async () => {
    requestToJoin.mockResolvedValue(pending)
    withdrawRequest.mockResolvedValue(undefined)
    await renderSheet("form")

    await userEvent.click(await screen.findByRole("button", { name: "Odeslat žádost" }))
    const sent = await screen.findByRole("dialog", { name: "Žádost je odeslaná" })
    await userEvent.click(within(sent).getByRole("button", { name: "Zrušit žádost" }))
    const confirm = await screen.findByRole("dialog", { name: "Zrušit žádost o účast?" })
    expect(withdrawRequest).not.toHaveBeenCalled()

    await userEvent.click(within(confirm).getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zrušena"))
    expect(withdrawRequest.mock.calls[0]?.[0]).toBe("e1")
    expect(screen.getByText("krok: zavřeno")).toBeInTheDocument()
  })

  it("keeps the request when the person changes their mind", async () => {
    await renderSheet("withdraw")

    await userEvent.click(await screen.findByRole("button", { name: "Nechat žádost" }))

    expect(screen.getByText("krok: zavřeno")).toBeInTheDocument()
    expect(withdrawRequest).not.toHaveBeenCalled()
  })
})
