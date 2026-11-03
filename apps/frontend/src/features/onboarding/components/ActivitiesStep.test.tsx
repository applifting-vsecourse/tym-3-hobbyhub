import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { ActivitiesStep } from "@/features/onboarding/components/ActivitiesStep"

const activities = [
  { id: "a1", name: "Florbal", icon: "florbal" },
  { id: "a3", name: "Tenis", icon: "tenis" },
  { id: "a2", name: "Deskovky", icon: "deskove-hry" },
]

const levels = [
  { id: "l1", name: "Začátečníci" },
  { id: "l2", name: "Mírně pokročilí" },
  { id: "l3", name: "Pokročilí" },
]

const renderStep = async (onSubmit = vi.fn().mockResolvedValue(undefined), overrides = {}) => {
  await renderWithRouter(
    <ActivitiesStep
      activities={activities}
      activityLabel={(activity) => activity.name}
      levels={levels}
      isLoadingActivities={false}
      activitiesError={null}
      onReloadActivities={vi.fn()}
      initial={[]}
      isLast={false}
      isReturningToEvent={false}
      isSaving={false}
      hasSaveError={false}
      onSubmit={onSubmit}
      onSkip={vi.fn()}
      onSkipAll={vi.fn()}
      {...overrides}
    />,
  )
  return onSubmit
}

const addActivity = async (name: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: "Přidat aktivitu" }))
  await userEvent.click(await screen.findByRole("option", { name }))
}

const chooseLevel = async (activity: string, level: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: activity }))
  await userEvent.click(await screen.findByRole("option", { name: level }))
}

describe("ActivitiesStep", () => {
  it("skips the step when nothing is picked and the way on is pressed", async () => {
    const onSkip = vi.fn()
    const onSubmit = await renderStep(undefined, { onSkip })

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends an activity without a level, the level is optional", async () => {
    const onSubmit = await renderStep()

    await addActivity("Florbal")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({ items: [{ activityId: "a1", levelId: null }] })
  })

  it("sends the picked activities with the levels that were chosen", async () => {
    const onSubmit = await renderStep()

    await addActivity("Florbal")
    await addActivity("Deskovky")
    await chooseLevel("Florbal", "Pokročilí")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({
      items: [
        { activityId: "a1", levelId: "l3" },
        { activityId: "a2", levelId: null },
      ],
    })
  })

  it("takes a level back with the no-level choice", async () => {
    const onSubmit = await renderStep()

    await addActivity("Florbal")
    await chooseLevel("Florbal", "Mírně pokročilí")
    await chooseLevel("Florbal", "Bez úrovně")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({ items: [{ activityId: "a1", levelId: null }] })
  })

  it("lists nothing until an activity is added", async () => {
    await renderStep()

    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    await addActivity("Florbal")
    expect(screen.getByRole("list")).toHaveTextContent("Florbal")
  })

  it("removes a picked activity from the list", async () => {
    await renderStep()

    await addActivity("Florbal")
    await userEvent.click(screen.getByRole("button", { name: "Odebrat Florbal" }))

    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("combobox", { name: "Přidat aktivitu" }))
    expect(await screen.findByRole("option", { name: "Florbal" })).toBeInTheDocument()
  })

  it("has no way back on the first step", async () => {
    await renderStep()

    expect(screen.queryByRole("button", { name: "Zpět" })).not.toBeInTheDocument()
  })

  it("goes back to the previous step without saving", async () => {
    const onBack = vi.fn()
    const onSubmit = await renderStep(undefined, { onBack })

    await userEvent.click(screen.getByRole("button", { name: "Zpět" }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("takes a picked activity out of the select", async () => {
    await renderStep()

    await addActivity("Florbal")
    await userEvent.click(screen.getByRole("combobox", { name: "Přidat aktivitu" }))

    expect(await screen.findByRole("option", { name: "Tenis" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Florbal" })).not.toBeInTheDocument()
  })

  it("finds an activity by typing, without accents", async () => {
    await renderStep()

    await userEvent.click(screen.getByRole("combobox", { name: "Přidat aktivitu" }))
    await userEvent.type(screen.getByPlaceholderText(/Hledat/i), "flor")

    expect(await screen.findByRole("option", { name: "Florbal" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Tenis" })).not.toBeInTheDocument()
  })

  it("says so when every activity is added", async () => {
    await renderStep(undefined, { activities: [activities[0]] })

    await addActivity("Florbal")

    expect(screen.getByText("Už jste přidali všechny aktivity.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Přidat aktivitu" })).toBeDisabled()
  })

  it("shows a grey prompt, not a value, while there is no level", async () => {
    await renderStep()

    await addActivity("Florbal")

    expect(screen.getByRole("combobox", { name: "Florbal" })).toHaveTextContent("Přidat úroveň")
  })

  it("says nothing is available when there are no activities", async () => {
    await renderStep(undefined, { activities: [] })

    expect(screen.getByText("Zatím nejsou k dispozici žádné aktivity.")).toBeInTheDocument()
  })

  it("offers a retry when the activities cannot be loaded", async () => {
    const onReloadActivities = vi.fn()
    await renderStep(undefined, { activitiesError: new Error("boom"), onReloadActivities })

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onReloadActivities).toHaveBeenCalledTimes(1)
  })

  it("shows where you are with a progress bar", async () => {
    await renderStep()

    expect(screen.getByRole("progressbar", { name: "Průběh nastavení profilu" })).toHaveAttribute(
      "aria-valuetext",
      "Krok 1 ze 3",
    )
  })

  it("announces an added activity to a screen reader", async () => {
    await renderStep()

    await addActivity("Florbal")

    expect(screen.getByRole("status")).toHaveTextContent("Přidáno: Florbal")
  })

  it("asks for an activity when the saved ones were all removed, rather than skipping", async () => {
    const onSkip = vi.fn()
    const initial = [{ activity: activities[0]!, level: null }]
    await renderStep(undefined, { initial, onSkip })

    await userEvent.click(screen.getByRole("button", { name: "Odebrat Florbal" }))
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(await screen.findByText("Vyberte aspoň jednu aktivitu.")).toBeInTheDocument()
    expect(onSkip).not.toHaveBeenCalled()
  })

  it("offers the levels from the catalogue, and nothing else", async () => {
    await renderStep()

    await addActivity("Florbal")
    await userEvent.click(screen.getByRole("combobox", { name: "Florbal" }))

    expect(await screen.findByRole("option", { name: "Začátečníci" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Mírně pokročilí" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Pokročilí" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Všechny úrovně" })).not.toBeInTheDocument()
  })

  it("shows the level that was saved before", async () => {
    const initial = [{ activity: activities[0]!, level: levels[2]! }]
    await renderStep(undefined, { initial })

    expect(screen.getByRole("combobox", { name: "Florbal" })).toHaveTextContent("Pokročilí")
  })
})
