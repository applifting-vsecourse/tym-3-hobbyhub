import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Group } from "@/features/group/api/groupSchemas"
import { GroupDetail } from "@/features/group/components/GroupDetail"
import { useGroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

const mockMembership = vi.hoisted(() => ({
  role: null as "OWNER" | "ADMIN" | "MEMBER" | null,
}))
const leaveGroup = vi.hoisted(() => vi.fn())
vi.mock("@/features/group/api/leaveGroup", () => ({ leaveGroup }))
vi.mock("@/features/group/api/groupMembershipQueryOptions", () => ({
  groupMembershipQueryOptions: (id: string) => ({
    queryKey: ["groups", "detail", id, "membership"],
    queryFn: () =>
      Promise.resolve({ isMember: mockMembership.role !== null, role: mockMembership.role }),
  }),
}))

const group: Group = {
  id: "g1",
  name: "Čtvrteční florbalisté",
  description: "Rekreační florbal každý čtvrtek.",
  locationName: "Praha 8",
  usualSchedule: "Čtvrtky 19:00",
  visibility: "PUBLIC",
  status: "ACTIVE",
  createdAt: new Date(2026, 0, 1),
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  memberCount: 14,
}

// What the page does: it owns the session and hands the state down.
function Page({ isSignedIn }: { isSignedIn: boolean }) {
  const membership = useGroupMembershipState(group.id, { isSignedIn, isPending: false })
  return (
    <GroupDetail
      group={group}
      activityLabel="Florbal"
      membership={membership}
      from="%2Fgroups%2Fg1"
    />
  )
}

const renderDetail = (isSignedIn: boolean) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Page isSignedIn={isSignedIn} />
    </QueryClientProvider>,
  )

// A member who signs out while the page stays open: the cache still holds the
// membership answer, the session no longer does.
function SignOutPage() {
  const [isSignedIn, setIsSignedIn] = useState(true)
  return (
    <>
      <button onClick={() => setIsSignedIn(false)}>test sign out</button>
      <Page isSignedIn={isSignedIn} />
    </>
  )
}

describe("GroupDetail", () => {
  beforeEach(() => {
    mockMembership.role = null
    leaveGroup.mockReset()
    leaveGroup.mockResolvedValue(undefined)
  })

  it("shows a visitor the basics, the member count and a way to sign up", async () => {
    await renderDetail(false)

    expect(
      screen.getByRole("heading", { level: 1, name: "Čtvrteční florbalisté" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Veřejná skupina · Praha 8 · Čtvrtky 19:00 · 14 členů/)).toBeVisible()
    expect(screen.getByText("Rekreační florbal každý čtvrtek.")).toBeVisible()
    expect(screen.queryByRole("heading", { name: /Členové/ })).not.toBeInTheDocument()

    const request = screen.getByRole("link", { name: "Požádat o členství" })
    expect(request).toHaveAttribute("href", "/signup?from=%252Fgroups%252Fg1")
    expect(screen.getByRole("link", { name: "Přihlásit se" })).toHaveAttribute(
      "href",
      "/login?from=%252Fgroups%252Fg1",
    )
  })

  it("says the upcoming events are being worked on", async () => {
    await renderDetail(false)

    expect(screen.getByRole("heading", { name: "Nadcházející akce" })).toBeInTheDocument()
    expect(screen.getByText(/Na této funkci právě pracujeme/)).toBeVisible()
  })

  it("stops showing a member's state once they sign out", async () => {
    mockMembership.role = "MEMBER"
    await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SignOutPage />
      </QueryClientProvider>,
    )
    expect(await screen.findByText("Jste členem")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "test sign out" }))

    expect(await screen.findByRole("link", { name: "Požádat o členství" })).toBeVisible()
    expect(screen.queryByText("Jste členem")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Odejít ze skupiny" })).not.toBeInTheDocument()
  })

  describe("asking to join", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it("counts down, lets the user withdraw, and then accepts after 10 seconds", async () => {
      await renderDetail(true)

      // Disabled until we know the user is not a member yet.
      const requestButton = () => screen.getByRole("button", { name: "Požádat o členství" })
      await waitFor(() => expect(requestButton()).toBeEnabled())
      fireEvent.click(requestButton())
      expect(screen.getByText("Žádost odeslána")).toBeVisible()
      expect(screen.getByRole("status")).toHaveTextContent("Za 10 sekund")

      act(() => void vi.advanceTimersByTime(3000))
      expect(screen.getByRole("status")).toHaveTextContent("Za 7 sekund")

      // Withdrawn: back to the start, still 14 members.
      fireEvent.click(screen.getByRole("button", { name: "Odvolat žádost" }))
      expect(screen.getByRole("button", { name: "Požádat o členství" })).toBeVisible()
      expect(screen.getByText(/14 členů/)).toBeVisible()

      fireEvent.click(screen.getByRole("button", { name: "Požádat o členství" }))
      act(() => void vi.advanceTimersByTime(10_000))

      expect(screen.getByText("Jste členem")).toBeVisible()
      expect(screen.queryByRole("button", { name: "Požádat o členství" })).not.toBeInTheDocument()
      expect(screen.getByText(/15 členů/)).toBeVisible()
    })

    it("shows an existing member their state instead of the button", async () => {
      mockMembership.role = "MEMBER"
      await renderDetail(true)

      expect(await screen.findByText("Jste členem")).toBeVisible()
      expect(screen.queryByRole("button", { name: "Požádat o členství" })).not.toBeInTheDocument()
    })

    describe("leaving", () => {
      const openLeaveDialog = async () => {
        fireEvent.click(await screen.findByRole("button", { name: "Odejít ze skupiny" }))
        return screen.findByRole("dialog")
      }

      it("asks before leaving, and stays when the user changes their mind", async () => {
        mockMembership.role = "MEMBER"
        await renderDetail(true)

        const dialog = await openLeaveDialog()
        expect(dialog).toHaveTextContent("Opravdu chcete odejít ze skupiny?")
        expect(leaveGroup).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", { name: "Zůstat ve skupině" }))

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(leaveGroup).not.toHaveBeenCalled()
        expect(screen.getByText("Jste členem")).toBeVisible()
      })

      it("leaves once the user confirms", async () => {
        mockMembership.role = "MEMBER"
        await renderDetail(true)

        await openLeaveDialog()
        mockMembership.role = null
        fireEvent.click(screen.getByRole("button", { name: "Odejít" }))

        await waitFor(() => expect(leaveGroup).toHaveBeenCalledWith("g1"))
        expect(
          await screen.findByRole("button", { name: "Požádat o členství" }),
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })

      it("keeps the dialog open and says so when leaving fails", async () => {
        mockMembership.role = "MEMBER"
        leaveGroup.mockRejectedValue(new Error("nope"))
        await renderDetail(true)

        await openLeaveDialog()
        fireEvent.click(screen.getByRole("button", { name: "Odejít" }))

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Ze skupiny se nepodařilo odejít",
        )
        expect(screen.getByRole("dialog")).toBeVisible()
      })

      it("does not offer the owner a way out", async () => {
        mockMembership.role = "OWNER"
        await renderDetail(true)

        expect(await screen.findByText("Jste členem")).toBeVisible()
        expect(screen.queryByRole("button", { name: "Odejít ze skupiny" })).not.toBeInTheDocument()
      })

      it("lets a user who was just accepted leave again without asking the server", async () => {
        await renderDetail(true)
        const requestButton = () => screen.getByRole("button", { name: "Požádat o členství" })
        await waitFor(() => expect(requestButton()).toBeEnabled())
        fireEvent.click(requestButton())
        act(() => void vi.advanceTimersByTime(10_000))

        await openLeaveDialog()
        fireEvent.click(screen.getByRole("button", { name: "Odejít" }))

        expect(await screen.findByRole("button", { name: "Požádat o členství" })).toBeVisible()
        expect(leaveGroup).not.toHaveBeenCalled()
        expect(screen.getByText(/14 členů/)).toBeVisible()
      })
    })
  })
})
