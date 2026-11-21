import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthLayout } from "@/components/AuthLayout"
import { renderWithRouter } from "@/test/renderWithRouter"

const renderLayout = (isAdministration?: boolean) =>
  renderWithRouter(
    <AuthLayout
      title="Přihlášení"
      description="Popis"
      footer={null}
      isAdministration={isAdministration}
    >
      formulář
    </AuthLayout>,
  )

// #262: the sign-in pages have no footer, so the language switch sits under the form.
describe("AuthLayout", () => {
  it("offers the languages under the form, and no switchers in the header", async () => {
    await renderLayout()

    expect(screen.getByRole("group", { name: "Jazyk:" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Přepnout motiv" })).not.toBeInTheDocument()
  })

  it("keeps the administration's switchers in the header instead", async () => {
    await renderLayout(true)

    expect(screen.queryByRole("group", { name: "Jazyk:" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Jazyk" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Přepnout motiv" })).toBeInTheDocument()
  })
})
