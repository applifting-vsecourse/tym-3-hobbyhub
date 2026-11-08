import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
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

const BALL = { id: "c-ball", name: "Míčové sporty", icon: "micove-sporty", order: 1 }
const PRECISION = { id: "c-precision", name: "Přesnost a míření", icon: "presnost", order: 3 }
const GROUPED_OPTIONS: ActivityComboboxOption[] = [
  { id: "a-lukostrelba", label: "Lukostřelba", icon: "lukostrelba", category: PRECISION },
  { id: "a-volejbal", label: "Volejbal", icon: "volejbal", category: BALL },
  { id: "a-fotbal", label: "Fotbal", icon: "fotbal", category: BALL },
]

const renderGrouped = () => {
  render(
    <ActivityCombobox
      aria-label="Aktivita"
      options={GROUPED_OPTIONS}
      value=""
      onValueChange={vi.fn()}
      placeholder="Vyberte aktivitu"
    />,
  )
  return userEvent.setup()
}

describe("ActivityCombobox categories", () => {
  it("groups the activities under their categories, in category order", async () => {
    const user = renderGrouped()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))

    const groups = await screen.findAllByRole("group")
    expect(
      groups.map((group) => [
        group.getAttribute("aria-labelledby") &&
          document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent,
        within(group)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ]),
    ).toEqual([
      ["Míčové sporty", ["Fotbal", "Volejbal"]],
      ["Přesnost a míření", ["Lukostřelba"]],
    ])
  })

  it("finds a niche sport by name, without accents", async () => {
    const user = renderGrouped()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.type(await screen.findByPlaceholderText("Hledat aktivitu…"), "lukostrelba")

    expect(screen.getByRole("option", { name: "Lukostřelba" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Přesnost a míření" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Míčové sporty" })).not.toBeInTheDocument()
  })

  it("lists every activity of a category when its name is typed", async () => {
    const user = renderGrouped()

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.type(await screen.findByPlaceholderText("Hledat aktivitu…"), "micove")

    expect(screen.getByRole("option", { name: "Fotbal" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Volejbal" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Lukostřelba" })).not.toBeInTheDocument()
  })
})
