import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { AdministratorRefusedError } from "@/features/admin/api/administratorMutations"
import { InviteAdministratorSheet } from "@/features/admin/components/InviteAdministratorSheet"

const renderSheet = (props: { error?: unknown; onSubmit?: () => Promise<unknown> } = {}) =>
  renderWithRouter(
    <InviteAdministratorSheet
      isOpen
      onOpenChange={() => undefined}
      isPending={false}
      error={props.error ?? null}
      onSubmit={props.onSubmit ?? (() => Promise.resolve())}
    />,
  )

describe("InviteAdministratorSheet", () => {
  it("sends the trimmed e-mail and name", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => Promise.resolve())
    await renderSheet({ onSubmit })

    await user.type(screen.getByLabelText("E-mail"), " petr@example.com ")
    await user.type(screen.getByLabelText("Jméno"), " Petr ")
    await user.click(screen.getByRole("button", { name: "Poslat pozvánku" }))

    expect(onSubmit).toHaveBeenCalledWith({ email: "petr@example.com", name: "Petr" })
  })

  it("asks for both fields before sending", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => Promise.resolve())
    await renderSheet({ onSubmit })

    await user.click(screen.getByRole("button", { name: "Poslat pozvánku" }))

    expect(await screen.findByText("Zadejte e-mail")).toBeInTheDocument()
    expect(screen.getByText("Zadejte jméno")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("points a removed administrator to giving their access back", async () => {
    await renderSheet({ error: new AdministratorRefusedError(["DEACTIVATED_ADMINISTRATOR"]) })

    expect(
      screen.getByText("Tento správce byl odebrán. Najděte ho v seznamu a obnovte mu přístup."),
    ).toBeInTheDocument()
  })
})
