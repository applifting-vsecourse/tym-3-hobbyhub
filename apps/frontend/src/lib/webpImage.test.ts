import { describe, expect, it } from "vitest"

import { dataUrlBytes } from "@/lib/webpImage"

describe("dataUrlBytes", () => {
  it("counts the picture, not the base64 text", () => {
    const bytes = new Uint8Array(1000).fill(1)
    const dataUrl = `data:image/webp;base64,${btoa(String.fromCharCode(...bytes))}`

    expect(dataUrlBytes(dataUrl)).toBe(1000)
  })

  it.each([
    ["QQ==", 1],
    ["QUI=", 2],
    ["QUJD", 3],
  ])("handles the padding of %s", (payload, expected) => {
    expect(dataUrlBytes(`data:image/webp;base64,${payload}`)).toBe(expected)
  })
})
