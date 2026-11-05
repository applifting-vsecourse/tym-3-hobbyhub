import { describe, expect, it } from "vitest"

import { contactHref, contactKind } from "@/features/event/lib/contact"

describe("contactKind", () => {
  it.each([
    ["jana@example.com", "email"],
    ["+420 777 123 456", "phone"],
    ["777123456", "phone"],
    ["https://www.facebook.com/groups/florbal", "link"],
    ["http://t.me/skupina", "link"],
  ])("takes %s for %s", (value, kind) => {
    expect(contactKind(value)).toBe(kind)
  })

  it.each(["", "zavolej mi", "facebook.com/groups/florbal", "javascript:alert(1)", "a@b"])(
    "refuses %j",
    (value) => {
      expect(contactKind(value)).toBeNull()
    },
  )
})

describe("contactHref", () => {
  it("opens the right app for each kind", () => {
    expect(contactHref("jana@example.com", "email")).toBe("mailto:jana@example.com")
    expect(contactHref("+420 777 123 456", "phone")).toBe("tel:+420777123456")
    expect(contactHref("https://t.me/skupina", "link")).toBe("https://t.me/skupina")
  })
})
