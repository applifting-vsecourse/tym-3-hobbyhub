import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ProfileCoverPicker } from "@/components/hobbyhub/ProfileCoverPicker"

describe("ProfileCoverPicker", () => {
  beforeAll(() => {
    // jsdom has no matchMedia; the sheet needs one to pick dialog or drawer.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  const renderPicker = (value: string | null = null, onChange = vi.fn()) => {
    render(
      <ProfileCoverPicker
        value={value}
        firstActivityIcon="florbal"
        onChange={onChange}
      />,
    )
    return onChange
  }

  it("offers at least 20 covers and the default of the first sport", async () => {
    renderPicker()

    await userEvent.click(screen.getByRole("button", { name: "Změnit grafiku" }))

    expect(await screen.findByRole("button", { name: /Podle prvního sportu/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    // The default plus one tile per cover.
    expect(screen.getAllByRole("button", { pressed: false }).length).toBeGreaterThanOrEqual(20)
  })

  it("hands back the id of the cover picked and closes", async () => {
    const onChange = renderPicker()

    await userEvent.click(screen.getByRole("button", { name: "Změnit grafiku" }))
    await userEvent.click(await screen.findByRole("button", { name: /Šachy/ }))

    expect(onChange).toHaveBeenCalledWith("sachy")
  })

  it("goes back to the default with null", async () => {
    const onChange = renderPicker("sachy")

    await userEvent.click(screen.getByRole("button", { name: "Změnit grafiku" }))
    await userEvent.click(await screen.findByRole("button", { name: /Podle prvního sportu/ }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("keeps the person's own picture as a tile of its own", async () => {
    renderPicker("data:image/webp;base64,AAAA")

    await userEvent.click(screen.getByRole("button", { name: "Změnit grafiku" }))

    expect(await screen.findByRole("button", { name: /Váš obrázek/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("refuses a file that is not an image", async () => {
    const onChange = renderPicker()

    await userEvent.click(screen.getByRole("button", { name: "Změnit grafiku" }))
    const input = await screen.findByLabelText("Nahrát vlastní obrázek", { selector: "input" })
    await userEvent.upload(input, new File(["x"], "a.gif", { type: "image/gif" }), {
      applyAccept: false,
    })

    expect(await screen.findByRole("alert")).toHaveTextContent("JPG, PNG nebo WebP")
    expect(onChange).not.toHaveBeenCalled()
  })
})
