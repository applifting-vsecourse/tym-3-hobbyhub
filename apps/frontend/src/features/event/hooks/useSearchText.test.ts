import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SEARCH_DEBOUNCE_MS, useSearchText } from "@/features/event/hooks/useSearchText"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useSearchText", () => {
  it("sends the text after a pause, trimmed, and only once", () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSearchText("", onCommit))

    act(() => result.current[1]("flo"))
    act(() => result.current[1]("florbal "))
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    })
    expect(onCommit).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("florbal")
    expect(result.current[0]).toBe("florbal ")
  })

  it("shows a text the address got on its own (back button, a link)", () => {
    const { result, rerender } = renderHook(({ committed }) => useSearchText(committed, vi.fn()), {
      initialProps: { committed: "tenis" },
    })

    rerender({ committed: "golf" })

    expect(result.current[0]).toBe("golf")
  })

  it("does not send what the address already holds", () => {
    const onCommit = vi.fn()
    const { result } = renderHook(() => useSearchText("tenis", onCommit))

    act(() => result.current[1](" tenis"))
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
    })

    expect(onCommit).not.toHaveBeenCalled()
  })
})
