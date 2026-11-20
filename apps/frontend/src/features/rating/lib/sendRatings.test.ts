import { describe, expect, it, vi } from "vitest"

import { sendEach } from "@/features/rating/lib/sendRatings"

describe("sendEach (#235)", () => {
  it("sends everything, a few at a time, and says which failed and why", async () => {
    let running = 0
    let mostAtOnce = 0
    const send = vi.fn(async (id: string) => {
      running += 1
      mostAtOnce = Math.max(mostAtOnce, running)
      await Promise.resolve()
      running -= 1
      if (id === "b" || id === "e") throw new Error(`no ${id}`)
    })

    const failures = await sendEach(["a", "b", "c", "d", "e"], (id) => id, send, 2)

    expect(send).toHaveBeenCalledTimes(5)
    expect(mostAtOnce).toBe(2)
    expect([...failures.keys()]).toEqual(["b", "e"])
    expect(failures.get("b")).toEqual(new Error("no b"))
  })

  it("returns no failures when there is nothing to send", async () => {
    await expect(sendEach([], String, vi.fn())).resolves.toEqual(new Map())
  })
})
