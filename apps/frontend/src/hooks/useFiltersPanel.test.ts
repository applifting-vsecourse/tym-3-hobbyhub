import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useFiltersPanel } from "@/hooks/useFiltersPanel"

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe("useFiltersPanel", () => {
  it("is open by default and remembers being folded", () => {
    const { result } = renderHook(() => useFiltersPanel())
    expect(result.current.isExpanded).toBe(true)

    act(() => result.current.setExpanded(false))
    expect(result.current.isExpanded).toBe(false)

    // Another page with the panel, or the next visit.
    const { result: next } = renderHook(() => useFiltersPanel())
    expect(next.current.isExpanded).toBe(false)

    act(() => next.current.setExpanded(true))
    expect(renderHook(() => useFiltersPanel()).result.current.isExpanded).toBe(true)
  })

  it("stays open and works when the storage refuses access", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const { result } = renderHook(() => useFiltersPanel())
    expect(result.current.isExpanded).toBe(true)

    act(() => result.current.setExpanded(false))
    expect(result.current.isExpanded).toBe(false)
  })
})
