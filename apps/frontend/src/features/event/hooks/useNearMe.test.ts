import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useNearMe } from "@/features/event/hooks/useNearMe"

const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2

function stubGeolocation(result: "ok" | number) {
  const getCurrentPosition = vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
    if (result === "ok") {
      success({ coords: { latitude: 50.08754, longitude: 14.42131 } } as GeolocationPosition)
    } else {
      failure({ code: result, PERMISSION_DENIED } as GeolocationPositionError)
    }
  })
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } })
  return getCurrentPosition
}

afterEach(() => vi.unstubAllGlobals())

describe("useNearMe", () => {
  it("does not ask for the position until told to", () => {
    const getCurrentPosition = stubGeolocation("ok")
    const { result } = renderHook(() => useNearMe())

    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(result.current.status).toBe("idle")
    expect(result.current.position).toBeNull()
  })

  it("keeps the position rounded to about 100 m", () => {
    stubGeolocation("ok")
    const { result } = renderHook(() => useNearMe())

    act(() => result.current.request())

    expect(result.current.status).toBe("granted")
    expect(result.current.position).toEqual({ latitude: 50.088, longitude: 14.421 })
  })

  it("says so when the visitor refuses", () => {
    stubGeolocation(PERMISSION_DENIED)
    const { result } = renderHook(() => useNearMe())

    act(() => result.current.request())

    expect(result.current.status).toBe("denied")
    expect(result.current.position).toBeNull()
  })

  it("says so when the position cannot be found", () => {
    stubGeolocation(POSITION_UNAVAILABLE)
    const { result } = renderHook(() => useNearMe())

    act(() => result.current.request())

    expect(result.current.status).toBe("unavailable")
  })

  it("is unavailable in a browser without geolocation", () => {
    vi.stubGlobal("navigator", {})
    const { result } = renderHook(() => useNearMe())

    act(() => result.current.request())

    expect(result.current.status).toBe("unavailable")
  })

  it("forgets the position when cleared", () => {
    stubGeolocation("ok")
    const { result } = renderHook(() => useNearMe())
    act(() => result.current.request())

    act(() => result.current.clear())

    expect(result.current.status).toBe("idle")
    expect(result.current.position).toBeNull()
  })
})
