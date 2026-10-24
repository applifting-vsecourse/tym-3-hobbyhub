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

function MultipleHarness({ initialValue = [] }: { readonly initialValue?: string[] }) {
  const [value, setValue] = useState(initialValue)
  return (
    <ActivityCombobox
      aria-label="Aktivity"
      isMultiple
      options={OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="Všechny aktivity"
    />
  )
}

describe("ActivityCombobox isMultiple", () => {
  it("stays open while picking several, and a second pick removes one", async () => {
    const user = userEvent.setup()
    render(<MultipleHarness />)
    const combobox = screen.getByRole("combobox", { name: "Aktivity" })

    await user.click(combobox)
    await user.click(await screen.findByRole("option", { name: "Florbal" }))
    await user.click(screen.getByRole("option", { name: "Volejbal" }))

    expect(screen.getByRole("option", { name: "Florbal" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("option", { name: "Šachy" })).toHaveAttribute("aria-checked", "false")
    expect(combobox).toHaveTextContent("2 aktivity")

    await user.click(screen.getByRole("option", { name: "Florbal" }))
    expect(combobox).toHaveTextContent("Volejbal")
    expect(combobox).not.toHaveTextContent("Florbal")

    await user.click(screen.getByRole("option", { name: "Volejbal" }))
    expect(combobox).toHaveTextContent("Všechny aktivity")
  })

  it("lists a chosen id it does not know, so it can be removed", async () => {
    const user = userEvent.setup()
    render(<MultipleHarness initialValue={["a-florbal", "a-retired"]} />)
    const combobox = screen.getByRole("combobox", { name: "Aktivity" })
    expect(combobox).toHaveTextContent("2 aktivity")

    await user.click(combobox)
    const unknown = await screen.findByRole("option", { name: "Neznámá aktivita" })
    expect(unknown).toHaveAttribute("aria-checked", "true")

    await user.click(unknown)
    expect(screen.queryByRole("option", { name: "Neznámá aktivita" })).not.toBeInTheDocument()
    expect(combobox).toHaveTextContent("Florbal")
  })
})

describe("ActivityCombobox order", () => {
  it("lists the activities alphabetically in the app's language", async () => {
    const user = userEvent.setup()
    render(
      <ActivityCombobox
        aria-label="Aktivita"
        options={[
          { id: "a-chuze", label: "Chůze", icon: "" },
          { id: "a-hokej", label: "Hokej", icon: "" },
          { id: "a-florbal", label: "Florbal", icon: "florbal" },
        ]}
        value=""
        onValueChange={vi.fn()}
        placeholder="Vyberte aktivitu"
      />,
    )

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))

    // Czech sorts "Ch" after "H"; the browser's own locale would put "Chůze" first.
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual([
      "Florbal",
      "Hokej",
      "Chůze",
    ])
  })
})
