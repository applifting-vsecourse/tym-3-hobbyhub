import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { BirthDatePicker } from "@/features/auth/components/BirthDatePicker"

function Picker({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <BirthDatePicker
        value={value}
        onChange={setValue}
      />
      <output aria-label="value">{value}</output>
    </>
  )
}

const changeYear = async (year: number) => {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button"))
  const dialog = await screen.findByRole("dialog")
  const [, yearSelect] = within(dialog).getAllByRole("combobox")
  await user.selectOptions(yearSelect!, String(year))
  return user
}

describe("BirthDatePicker", () => {
  it("moves the date when only the year changes and the picker is closed with Escape", async () => {
    render(<Picker initial="1995-04-12" />)

    const user = await changeYear(1990)
    await user.keyboard("{Escape}")

    expect(screen.getByRole("status", { name: "value" })).toHaveTextContent("1990-04-12")
  })

  it("moves the date when the user clicks outside", async () => {
    render(<Picker initial="1996-02-29" />)

    const user = await changeYear(1997)
    await user.click(screen.getByRole("status", { name: "value" }))

    // 1997 has no 29 February: the last day of the month instead.
    expect(screen.getByRole("status", { name: "value" })).toHaveTextContent("1997-02-28")
  })

  it("leaves the date alone when nothing changed", async () => {
    render(<Picker initial="1995-04-12" />)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button"))
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")

    expect(screen.getByRole("status", { name: "value" })).toHaveTextContent("1995-04-12")
  })
})
