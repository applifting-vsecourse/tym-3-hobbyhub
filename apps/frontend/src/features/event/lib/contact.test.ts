import { describe, expect, it } from "vitest"

import { contactHref, contactKind } from "@/features/event/lib/contact"

describe("contactKind", () => {
  it.each([
    ["jana@example.com", "email"],
    ["+420 777 123 456", "phone"],
    ["777123456", "phone"],
  ])("takes %s for %s", (value, kind) => {
    expect(contactKind(value)).toBe(kind)
  })

  it.each([
    "",
    "zavolej mi",
    "a@b",
    "https://example.com/@jana.novak",
    "https://t.me/skupina",
    "2026-11-06",
    "1------",
    "12345678",
  ])("refuses %j", (value) => {
    expect(contactKind(value)).toBeNull()
  })
})

describe("contactHref", () => {
  it("opens the right app for each kind", () => {
    expect(contactHref("jana@example.com", "email")).toBe("mailto:jana@example.com")
    expect(contactHref("+420 777 123 456", "phone")).toBe("tel:+420777123456")
  })
})
