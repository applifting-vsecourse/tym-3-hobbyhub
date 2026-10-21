import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ProfilePicturePicker,
  type ProfilePicture,
} from "@/components/hobbyhub/ProfilePicturePicker"

const file = (name: string, type: string, size = 1000) => {
  const result = new File(["x"], name, { type })
  Object.defineProperty(result, "size", { value: size })
  return result
}

// Holds the choice the way a screen does.
function Harness({ hint }: { hint?: string }) {
  const [value, setValue] = useState<ProfilePicture | null>(null)
  return (
    <ProfilePicturePicker
      value={value}
      onChange={setValue}
      hint={hint}
    />
  )
}

const openSheet = async () => {
  await userEvent.click(screen.getByRole("button", { name: /obrázek/ }))
  return screen.findByRole("dialog", { name: "Vyberte si obrázek" })
}

describe("ProfilePicturePicker", () => {
  const revokeObjectURL = vi.fn()

  beforeAll(() => {
    // jsdom has no matchMedia; pretend to be a desktop so the sheet is a dialog.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview")
    revokeObjectURL.mockClear()
    URL.revokeObjectURL = revokeObjectURL
  })

  it("starts without a picture and shows the hint it is given", () => {
    render(<Harness hint="Zatím se neukládá." />)

    expect(screen.getByRole("button", { name: "Vybrat obrázek" })).toBeInTheDocument()
    expect(screen.getByText("Zatím žádný obrázek")).toBeInTheDocument()
    expect(screen.getByText("Zatím se neukládá.")).toBeInTheDocument()
  })

  it("offers every avatar in a sheet and shows the one that was chosen", async () => {
    render(<Harness />)

    const dialog = await openSheet()
    expect(within(dialog).getAllByRole("button", { pressed: false })).toHaveLength(12)
    await userEvent.click(within(dialog).getByRole("button", { name: "Florbalista" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Florbalista" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Změnit obrázek" })).toBeInTheDocument()
  })

  it("marks the chosen avatar when the sheet is opened again", async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole("button", { name: "Vybrat obrázek" }))
    await userEvent.click(await screen.findByRole("button", { name: "Tenistka" }))
    const dialog = await openSheet()

    expect(
      within(dialog).getByRole("button", { name: "Tenistka", pressed: true }),
    ).toBeInTheDocument()
  })

  it("takes a chosen picture back", async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole("button", { name: "Vybrat obrázek" }))
    await userEvent.click(await screen.findByRole("button", { name: "Běžec" }))
    const dialog = await openSheet()
    await userEvent.click(within(dialog).getByRole("button", { name: "Odebrat obrázek" }))

    expect(screen.getByText("Zatím žádný obrázek")).toBeInTheDocument()
  })

  it("previews an uploaded photo", async () => {
    render(<Harness />)

    const dialog = await openSheet()
    await userEvent.upload(
      within(dialog).getByLabelText("Nahrát vlastní fotku"),
      file("a.png", "image/png"),
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Vaše nahraná fotka" })).toHaveAttribute(
      "src",
      "blob:preview",
    )
  })

  it.each([
    ["a GIF", file("a.gif", "image/gif"), "Fotka musí být JPG nebo PNG."],
    [
      "a file over 5 MB",
      file("a.png", "image/png", 5 * 1024 * 1024 + 1),
      "Fotka může mít nejvýše 5 MB.",
    ],
  ])("refuses %s and keeps the sheet open", async (_name, photo, message) => {
    render(<Harness />)

    const dialog = await openSheet()
    await userEvent.upload(within(dialog).getByLabelText("Nahrát vlastní fotku"), photo, {
      applyAccept: false,
    })

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("releases the object URL of a photo once it is replaced", async () => {
    render(<Harness />)

    let dialog = await openSheet()
    await userEvent.upload(
      within(dialog).getByLabelText("Nahrát vlastní fotku"),
      file("a.png", "image/png"),
    )
    dialog = await openSheet()
    await userEvent.click(within(dialog).getByRole("button", { name: "Florbalista" }))

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview")
  })
})
