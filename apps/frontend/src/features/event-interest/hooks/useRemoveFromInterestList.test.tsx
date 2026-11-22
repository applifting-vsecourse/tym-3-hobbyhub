import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useRemoveFromInterestList } from "@/features/event-interest/hooks/useRemoveFromInterestList"

type ToastOptions = {
  action: { label: string; onClick: () => void }
  onAutoClose: () => void
  onDismiss: () => void
}

const { removeEventInterest, toast } = vi.hoisted(() => {
  const show = vi.fn()
  return {
    removeEventInterest: vi.fn(),
    toast: Object.assign(show, { error: vi.fn() }),
  }
})
vi.mock("@/features/event-interest/api/eventInterest", () => ({ removeEventInterest }))
vi.mock("sonner", () => ({ toast }))

const setup = () => {
  const queryClient = new QueryClient()
  const hook = renderHook(() => useRemoveFromInterestList(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return hook
}

const lastToast = (): { message: string; options: ToastOptions } => {
  const [message, options] = toast.mock.calls.at(-1) as [string, ToastOptions]
  return { message, options }
}

describe("useRemoveFromInterestList", () => {
  it("hides the row at once and offers it back without asking the server", () => {
    const { result } = setup()

    act(() => result.current.remove("e1"))

    expect(result.current.hiddenIds.has("e1")).toBe(true)
    const { message, options } = lastToast()
    expect(message).toBe("Odebráno ze seznamu")
    expect(options.action.label).toBe("Vrátit")

    act(() => options.action.onClick())

    expect(result.current.hiddenIds.has("e1")).toBe(false)
    // Closing the toast after "Vrátit" sends nothing either.
    act(() => options.onAutoClose())
    expect(removeEventInterest).not.toHaveBeenCalled()
  })

  it("removes it on the server once the toast is gone", async () => {
    removeEventInterest.mockResolvedValue(undefined)
    const { result } = setup()

    act(() => result.current.remove("e1"))
    act(() => lastToast().options.onAutoClose())
    act(() => lastToast().options.onDismiss())

    expect(removeEventInterest).toHaveBeenCalledOnce()
    expect(removeEventInterest).toHaveBeenCalledWith("e1", { shouldKeepAlive: false })
    await waitFor(() => expect(result.current.hiddenIds.has("e1")).toBe(false))
  })

  it("brings the row back and says so when the server refuses", async () => {
    removeEventInterest.mockRejectedValue(new Error("offline"))
    const { result } = setup()

    act(() => result.current.remove("e1"))
    act(() => lastToast().options.onAutoClose())

    await waitFor(() => expect(result.current.hiddenIds.has("e1")).toBe(false))
    expect(toast.error).toHaveBeenCalledWith(
      "Akci se nepodařilo odebrat ze seznamu. Zkuste to prosím znovu.",
    )
  })

  it("sends what is still pending when the page goes away", () => {
    removeEventInterest.mockResolvedValue(undefined)
    const { result, unmount } = setup()

    act(() => result.current.remove("e1"))
    unmount()

    expect(removeEventInterest).toHaveBeenCalledWith("e1", { shouldKeepAlive: true })
  })
})
