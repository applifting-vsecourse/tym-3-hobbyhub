import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  ActivityCombobox,
  type ActivityComboboxOption,
} from "@/components/hobbyhub/ActivityCombobox"

const OPTIONS: ActivityComboboxOption[] = [
  { id: "a-florbal", label: "Florbal", icon: "florbal" },
  { id: "a-sachy", label: "Šachy", icon: "sachy" },
  { id: "a-volejbal", label: "Volejbal", icon: "volejbal" },
]

function Harness({ onValueChange }: { readonly onValueChange: (id: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <ActivityCombobox
      aria-label="Aktivita"
      options={OPTIONS}
      value={value}
      onValueChange={(id) => {
        setValue(id)
        onValueChange(id)
      }}
      placeholder="Vyberte aktivitu"
    />
  )
}

const renderCombobox = () => {
  const onValueChange = vi.fn()
  render(<Harness onValueChange={onValueChange} />)
  return { onValueChange, user: userEvent.setup() }
}

describe("ActivityCombobox", () => {
  it("filters the activities as you type, ignoring accents and case", async () => {
    const { user } = renderCombobox()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.type(await screen.findByPlaceholderText("Hledat aktivitu…"), "SACHY")

    expect(screen.getByRole("option", { name: "Šachy" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Florbal" })).not.toBeInTheDocument()
  })

  it("says when nothing matches", async () => {
    const { user } = renderCombobox()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.type(await screen.findByPlaceholderText("Hledat aktivitu…"), "curling")

    expect(screen.getByText("Žádná aktivita neodpovídá")).toBeInTheDocument()
  })

  it("picks an activity, closes and shows it on the trigger", async () => {
    const { onValueChange, user } = renderCombobox()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.click(await screen.findByRole("option", { name: "Volejbal" }))

    expect(onValueChange).toHaveBeenCalledWith("a-volejbal")
    expect(screen.getByRole("combobox", { name: "Aktivita" })).toHaveTextContent("Volejbal")
    expect(screen.queryByRole("option", { name: "Volejbal" })).not.toBeInTheDocument()
  })
})
