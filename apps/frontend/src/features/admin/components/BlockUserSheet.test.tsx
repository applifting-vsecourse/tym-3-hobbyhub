import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { UserBlockRefusedError } from "@/features/admin/api/userBlockMutations"
import { BlockUserSheet } from "@/features/admin/components/BlockUserSheet"

const renderSheet = (props: { error?: unknown; onSubmit?: () => Promise<unknown> } = {}) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <BlockUserSheet
        isOpen
        onOpenChange={() => undefined}
        user={{ id: "u1", name: "Jana" }}
        isPending={false}
        error={props.error ?? null}
        onSubmit={props.onSubmit ?? (() => Promise.resolve())}
      />
    </QueryClientProvider>,
  )

describe("BlockUserSheet (#239)", () => {
  it("asks for the other person and a reason before blocking", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => Promise.resolve())
    await renderSheet({ onSubmit })

    await user.type(screen.getByLabelText("Důvod blokace"), "Spam")
    await user.click(screen.getByRole("button", { name: "Zablokovat" }))

    expect(await screen.findByText("Vyberte uživatele", { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText("Napište důvod, aspoň 10 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("says when the two are blocked already", async () => {
    await renderSheet({ error: new UserBlockRefusedError(["ALREADY_BLOCKED"]) })

    expect(screen.getByText("Tito dva už jsou proti sobě zablokovaní.")).toBeInTheDocument()
  })

  it("tells the administrator what the block does", async () => {
    await renderSheet()

    expect(screen.getByRole("heading", { name: "Zablokovat uživatele Jana vůči…" })).toBeVisible()
    expect(screen.getByText(/Nikdo z nich se o blokaci nedozví/)).toBeInTheDocument()
  })
})
