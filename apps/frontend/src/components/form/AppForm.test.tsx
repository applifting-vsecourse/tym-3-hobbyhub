import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import { AppForm } from "@/components/form/AppForm"
import { AWAY_PATH, renderWithRouter } from "@/test/renderWithRouter"

type HarnessProps = {
  readonly onSubmit?: () => Promise<void>
  readonly isGuarded?: boolean
}

function Harness({ onSubmit = () => Promise.resolve(), isGuarded }: HarnessProps) {
  const form = useForm({ defaultValues: { title: "" } })
  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      isGuarded={isGuarded}
    >
      <label htmlFor="title">Název</label>
      <input
        id="title"
        {...form.register("title")}
      />
      <button type="submit">Odeslat</button>
    </AppForm>
  )
}

const renderHarness = async (props: HarnessProps = {}) => {
  const { router } = await renderWithRouter(<Harness {...props} />)
  return { router, user: userEvent.setup() }
}

// Navigation blocked by the guard resolves only after the dialog is answered,
// so it must not be awaited here.
const leave = (router: Awaited<ReturnType<typeof renderHarness>>["router"]) => {
  void router.navigate({ to: AWAY_PATH })
}

const expectLocation = (
  router: Awaited<ReturnType<typeof renderHarness>>["router"],
  pathname: string,
) => vi.waitFor(() => expect(router.state.location.pathname).toBe(pathname))

describe("AppForm unsaved-changes guard", () => {
  it("lets an untouched form go", async () => {
    const { router } = await renderHarness()

    leave(router)

    await expectLocation(router, AWAY_PATH)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("asks before leaving a dirty form and stays on 'Zůstat'", async () => {
    const { router, user } = await renderHarness()
    await user.type(screen.getByLabelText("Název"), "Čtvrteční florbal")

    leave(router)

    const dialog = await screen.findByRole("dialog", { name: "Opustit stránku?" })
    expect(dialog).toHaveTextContent("Máte rozpracované změny")
    await user.click(screen.getByRole("button", { name: "Zůstat" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/")
    expect(screen.getByLabelText("Název")).toHaveValue("Čtvrteční florbal")
  })

  it("leaves on 'Odejít'", async () => {
    const { router, user } = await renderHarness()
    await user.type(screen.getByLabelText("Název"), "x")

    leave(router)
    await user.click(await screen.findByRole("button", { name: "Odejít" }))

    await expectLocation(router, AWAY_PATH)
  })

  it("stops guarding once a submit succeeded", async () => {
    const { router, user } = await renderHarness()
    await user.type(screen.getByLabelText("Název"), "x")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    leave(router)

    await expectLocation(router, AWAY_PATH)
  })

  it("keeps guarding when the submit failed", async () => {
    const { router, user } = await renderHarness({
      onSubmit: () => Promise.reject(new Error("server down")),
    })
    await user.type(screen.getByLabelText("Název"), "x")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    leave(router)

    expect(await screen.findByRole("dialog", { name: "Opustit stránku?" })).toBeInTheDocument()
  })

  it("can be switched off where typed input costs nothing", async () => {
    const { router, user } = await renderHarness({ isGuarded: false })
    await user.type(screen.getByLabelText("Název"), "x")

    leave(router)

    await expectLocation(router, AWAY_PATH)
  })
})
