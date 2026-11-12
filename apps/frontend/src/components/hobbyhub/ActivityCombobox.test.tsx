import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
    expect(combobox).toHaveTextContent("Florbal + 1")

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
    // The unknown one is listed first, so it leads the summary.
    expect(combobox).toHaveTextContent("Neznámá aktivita + 1")

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
  { id: "a-sipky", label: "Šipky", icon: "sipky", category: PRECISION },
  { id: "a-volejbal", label: "Volejbal", icon: "volejbal", category: BALL },
  { id: "a-fotbal", label: "Fotbal", icon: "fotbal", category: BALL },
]

function GroupedHarness({
  isMultiple = false,
  initialValue = [],
}: {
  readonly isMultiple?: boolean
  readonly initialValue?: string[]
}) {
  const [many, setMany] = useState(initialValue)
  const [one, setOne] = useState(initialValue[0] ?? "")
  return isMultiple ? (
    <ActivityCombobox
      aria-label="Aktivita"
      isMultiple
      options={GROUPED_OPTIONS}
      value={many}
      onValueChange={setMany}
      placeholder="Všechny aktivity"
    />
  ) : (
    <ActivityCombobox
      aria-label="Aktivita"
      options={GROUPED_OPTIONS}
      value={one}
      onValueChange={setOne}
      placeholder="Vyberte aktivitu"
    />
  )
}

const openGrouped = async (props: Parameters<typeof GroupedHarness>[0] = {}) => {
  const user = userEvent.setup()
  render(<GroupedHarness {...props} />)
  const combobox = screen.getByRole("combobox", { name: "Aktivita" })
  await user.click(combobox)
  await screen.findByPlaceholderText("Hledat aktivitu…")
  return { user, combobox }
}

const optionNames = () => screen.getAllByRole("option").map((option) => option.textContent)

describe("ActivityCombobox categories on a computer", () => {
  it("lists the categories in order, with the first one's activities beside them", async () => {
    await openGrouped()

    expect(optionNames()).toEqual(["Míčové sporty", "Přesnost a míření", "Fotbal", "Volejbal"])
  })

  it("shows a category's activities when it is pointed at or clicked", async () => {
    const { user } = await openGrouped()

    await user.hover(screen.getByRole("option", { name: "Přesnost a míření" }))
    expect(optionNames()).toEqual(["Míčové sporty", "Přesnost a míření", "Lukostřelba", "Šipky"])

    await user.click(screen.getByRole("option", { name: "Míčové sporty" }))
    expect(screen.getByRole("option", { name: "Volejbal" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Šipky" })).not.toBeInTheDocument()
  })

  it("opens on the category of the chosen activity", async () => {
    await openGrouped({ initialValue: ["a-sipky"] })

    expect(screen.getByRole("option", { name: "Šipky" })).toHaveAttribute("aria-checked", "true")
  })

  it("offers no whole category where one activity is picked", async () => {
    await openGrouped()

    expect(screen.queryByRole("option", { name: /Vybrat všechny/ })).not.toBeInTheDocument()
  })

  it("finds a niche sport by name, without accents, with its category under it", async () => {
    const { user } = await openGrouped()

    await user.type(screen.getByPlaceholderText("Hledat aktivitu…"), "lukostrelba")

    expect(optionNames()).toEqual(["LukostřelbaPřesnost a míření"])
  })

  it("lists every activity of a category when its name is typed", async () => {
    const { user } = await openGrouped()

    await user.type(screen.getByPlaceholderText("Hledat aktivitu…"), "micove")

    expect(optionNames()).toEqual(["FotbalMíčové sporty", "VolejbalMíčové sporty"])
  })
})

describe("ActivityCombobox whole categories in a filter", () => {
  it("chooses and clears a whole category, and names it on the trigger", async () => {
    const { user, combobox } = await openGrouped({ isMultiple: true })

    await user.click(screen.getByRole("option", { name: "Vybrat všechny (2)" }))
    expect(combobox).toHaveTextContent("Míčové sporty")
    expect(screen.getByRole("option", { name: "Fotbal" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("option", { name: /^Míčové sporty/ })).toHaveTextContent("2")

    await user.click(screen.getByRole("option", { name: "Vybrat všechny (2)" }))
    expect(combobox).toHaveTextContent("Všechny aktivity")
  })

  it("keeps the rest of a category when one of its activities is removed", async () => {
    const { user, combobox } = await openGrouped({
      isMultiple: true,
      initialValue: ["a-fotbal", "a-volejbal", "a-sipky"],
    })

    await user.click(screen.getByRole("option", { name: "Volejbal" }))

    expect(screen.getByRole("option", { name: "Fotbal" })).toHaveAttribute("aria-checked", "true")
    expect(combobox).toHaveTextContent("Fotbal + 1")
  })
})

describe("ActivityCombobox categories on a phone", () => {
  const desktop = window.matchMedia.bind(window)
  beforeEach(() => {
    window.matchMedia = (query: string) => ({ ...desktop(query), matches: false })
  })
  afterEach(() => {
    window.matchMedia = desktop
  })

  it("steps into a category and back in a bottom drawer", async () => {
    const { user } = await openGrouped()

    expect(screen.getByRole("dialog", { name: "Vyberte aktivitu" })).toBeInTheDocument()
    expect(optionNames()).toEqual(["Míčové sporty", "Přesnost a míření"])

    await user.click(screen.getByRole("option", { name: "Přesnost a míření" }))
    expect(optionNames()).toEqual(["Zpět na kategoriePřesnost a míření", "Lukostřelba", "Šipky"])

    await user.click(screen.getByRole("option", { name: /Zpět na kategorie/ }))
    expect(optionNames()).toEqual(["Míčové sporty", "Přesnost a míření"])
  })

  it("picks an activity and closes", async () => {
    const { user, combobox } = await openGrouped()

    await user.click(screen.getByRole("option", { name: "Míčové sporty" }))
    await user.click(screen.getByRole("option", { name: "Fotbal" }))

    expect(combobox).toHaveTextContent("Fotbal")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
