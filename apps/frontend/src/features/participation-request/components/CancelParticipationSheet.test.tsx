import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { CancelRefusedError } from "@/features/participation-request/api/cancelParticipation"
import {
  CancelParticipationSheet,
  type SeatSheetStep,
} from "@/features/participation-request/components/CancelParticipationSheet"

const { withdrawRequest, cancelParticipation, toast } = vi.hoisted(() => ({
  withdrawRequest: vi.fn(),
  cancelParticipation: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/participation-request/api/withdrawRequest", () => ({ withdrawRequest }))
vi.mock("@/features/participation-request/api/cancelParticipation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  cancelParticipation,
}))
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
  withdrawRequest.mockReset()
  cancelParticipation.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
})

// The page owns the step; this stands in for it.
function Page({ initialStep }: { initialStep: SeatSheetStep | null }) {
  const [step, setStep] = useState(initialStep)
  return (
    <>
      <p>krok: {step ?? "zavřeno"}</p>
      <CancelParticipationSheet
        eventId="e1"
        event={{
          title: "Čtvrteční florbal",
          time: "19:00",
          place: "ZŠ Kobylisy, Praha 8, Pokročilí",
          taken: 7,
          min: 8,
          max: 10,
        }}
        step={step}
        onStepChange={setStep}
      />
    </>
  )
}

const renderSheet = (initialStep: SeatSheetStep | null) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <Page initialStep={initialStep} />
    </QueryClientProvider>,
  )

describe("CancelParticipationSheet", () => {
  describe("withdrawing the request", () => {
    it("withdraws only after confirming and closes", async () => {
      withdrawRequest.mockResolvedValue(undefined)
      await renderSheet("withdraw")

      const confirm = await screen.findByRole("dialog", { name: "Zrušit žádost o účast?" })
      expect(within(confirm).getByText("Čtvrteční florbal")).toBeInTheDocument()
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

    it("says so when the server failed, and stays open", async () => {
      withdrawRequest.mockRejectedValue(new Error("network"))
      await renderSheet("withdraw")

      await userEvent.click(await screen.findByRole("button", { name: "Zrušit žádost" }))

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Žádost se nepodařilo zrušit. Zkus to znovu."),
      )
      expect(screen.getByText("krok: withdraw")).toBeInTheDocument()
    })
  })

  // F-06.4.
  describe("cancelling the seat", () => {
    const cancelField = () => screen.findByLabelText("Zpráva organizátorovi")

    it("sends the trimmed message and closes", async () => {
      cancelParticipation.mockResolvedValue(undefined)
      await renderSheet("cancel")

      const dialog = await screen.findByRole("dialog", { name: "Zrušit účast?" })
      expect(within(dialog).getByText("Čtvrteční florbal")).toBeInTheDocument()
      await userEvent.type(await cancelField(), "  Onemocněl jsem, promiňte.  ")
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit účast" }))

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Účast zrušena"))
      expect(cancelParticipation.mock.calls[0]?.[0]).toEqual({
        eventId: "e1",
        message: "Onemocněl jsem, promiňte.",
      })
      expect(screen.getByText("krok: zavřeno")).toBeInTheDocument()
    })

    it.each([
      ["no message", ""],
      ["fewer than 10 characters besides whitespace", "   krátce   "],
    ])("refuses %s before sending", async (_, typed) => {
      await renderSheet("cancel")

      const dialog = await screen.findByRole("dialog", { name: "Zrušit účast?" })
      if (typed) await userEvent.type(await cancelField(), typed)
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit účast" }))

      expect(
        await within(dialog).findByText("Napiš organizátorovi aspoň 10 znaků."),
      ).toBeInTheDocument()
      expect(cancelParticipation).not.toHaveBeenCalled()
    })

    it("says why the server kept the seat, and keeps the dialog open", async () => {
      cancelParticipation.mockRejectedValue(new CancelRefusedError(["EVENT_STARTED"]))
      await renderSheet("cancel")

      const dialog = await screen.findByRole("dialog", { name: "Zrušit účast?" })
      await userEvent.type(await cancelField(), "Onemocněl jsem, promiňte.")
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit účast" }))

      expect(
        await within(dialog).findByText("Akce už začala, účast už nejde zrušit."),
      ).toBeInTheDocument()
      expect(screen.getByText("krok: cancel")).toBeInTheDocument()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("keeps the seat when the person changes their mind", async () => {
      await renderSheet("cancel")

      await userEvent.click(await screen.findByRole("button", { name: "Nechat účast" }))

      expect(screen.getByText("krok: zavřeno")).toBeInTheDocument()
      expect(cancelParticipation).not.toHaveBeenCalled()
    })
  })
})
