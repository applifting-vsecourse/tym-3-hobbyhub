import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { MyRequestState } from "@/features/participation-request/api/participationRequestSchemas"
import { JoinRequestAction } from "@/features/participation-request/components/JoinRequestAction"

const applicant = { name: "Honza", image: null, bio: null, hasVerifiedEmail: true }

const renderAction = (state: MyRequestState | undefined, onRequest = vi.fn()) =>
  render(
    <JoinRequestAction
      label="Požádat o účast"
      state={state}
      isLoading={false}
      onRequest={onRequest}
    />,
  )

describe("JoinRequestAction", () => {
  it("opens the request when asking is allowed", async () => {
    const onRequest = vi.fn()
    renderAction({ request: null, violations: [], applicant }, onRequest)

    await userEvent.click(screen.getByRole("button", { name: "Požádat o účast" }))

    expect(onRequest).toHaveBeenCalledOnce()
  })

  it("explains a refusal next to an inactive button", () => {
    renderAction({ request: null, violations: ["EVENT_STARTED"], applicant })

    expect(screen.getByRole("button", { name: "Požádat o účast" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Požádat o účast" })).toHaveAccessibleDescription(
      "Akce už začala, o účast se nedá žádat.",
    )
  })

  it("lets the person try when their state could not be loaded", () => {
    renderAction(undefined)

    expect(screen.getByRole("button", { name: "Požádat o účast" })).toBeEnabled()
  })
})
