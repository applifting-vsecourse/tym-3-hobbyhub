import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { GroupForm, type ActivityOption } from "@/features/group/components/GroupForm"

const ACTIVITIES: ActivityOption[] = [
  { id: "a-volejbal", label: "Volejbal", icon: "volejbal" },
  { id: "a-florbal", label: "Florbal", icon: "florbal" },
]

const renderForm = async (props: Partial<Parameters<typeof GroupForm>[0]> = {}) => {
  const onSubmit = vi.fn()
  await renderWithRouter(
    <GroupForm
      activities={ACTIVITIES}
      isActivitiesLoading={false}
      isActivitiesError={false}
      onRetryActivities={vi.fn()}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, user: userEvent.setup() }
}

describe("GroupForm", () => {
  it("tells which required fields are missing", async () => {
    const { onSubmit, user } = await renderForm()

    await user.click(screen.getByRole("button", { name: "Vytvořit skupinu" }))

    expect(await screen.findByText("Zadejte název skupiny")).toBeInTheDocument()
    expect(screen.getByText("Vyberte aktivitu", { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText("Napište pár vět o skupině")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects a name shorter than three characters", async () => {
    const { user } = await renderForm()

    await user.type(screen.getByLabelText("Název skupiny"), "  ab  ")
    await user.click(screen.getByRole("button", { name: "Vytvořit skupinu" }))

    expect(await screen.findByText("Alespoň 3 znaky")).toBeInTheDocument()
  })

  it("counts an emoji as one character, as the server does", async () => {
    const { user } = await renderForm()

    await user.type(screen.getByLabelText("Název skupiny"), "🏀🏀")
    await user.click(screen.getByRole("button", { name: "Vytvořit skupinu" }))

    expect(await screen.findByText("Alespoň 3 znaky")).toBeInTheDocument()
  })

  it("sends trimmed values and leaves out empty optional fields", async () => {
    const { onSubmit, user } = await renderForm()

    await user.type(screen.getByLabelText("Název skupiny"), "  Čtvrteční florbalisté ")
    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.click(await screen.findByRole("option", { name: "Florbal" }))
    await user.type(screen.getByLabelText("Obvyklý termín (nepovinné)"), "   ")
    await user.type(screen.getByLabelText("Popis"), "Hrajeme každý čtvrtek.")
    await user.click(screen.getByRole("button", { name: "Vytvořit skupinu" }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Čtvrteční florbalisté",
      activityId: "a-florbal",
      description: "Hrajeme každý čtvrtek.",
      locationName: undefined,
      usualSchedule: undefined,
    })
  })

  it("offers a retry when activities fail to load", async () => {
    const onRetryActivities = vi.fn()
    const { user } = await renderForm({
      activities: [],
      isActivitiesError: true,
      onRetryActivities,
    })

    expect(screen.getByText("Aktivity se nepodařilo načíst.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetryActivities).toHaveBeenCalledTimes(1)
  })
})
