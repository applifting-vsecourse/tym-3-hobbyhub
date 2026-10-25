import { useState } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Group } from "@/features/group/api/groupSchemas"
import {
  groupMembersQueryOptions,
  pendingMembershipRequestsQueryOptions,
} from "@/features/group/api/membershipRequestQueryOptions"
import type {
  MembershipRequest,
  MembershipRuleViolation,
} from "@/features/group/api/membershipRequestSchemas"
import { GroupAdminPanel } from "@/features/group/components/GroupAdminPanel"
import { GroupDetail } from "@/features/group/components/GroupDetail"
import { GroupMembershipPanel } from "@/features/group/components/GroupMembershipPanel"
import { GroupMembersPreview } from "@/features/group/components/GroupMembersPreview"
import {
  MembershipRequestSheet,
  type MembershipSheetStep,
} from "@/features/group/components/MembershipRequestSheet"
import { useGroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

// What the server answers; each test sets its own.
const server = vi.hoisted(() => ({
  role: null as "OWNER" | "ADMIN" | "MEMBER" | null,
  request: null as MembershipRequest | null,
  violations: [] as MembershipRuleViolation[],
}))
const { leaveGroup, requestMembership, withdrawMembershipRequest, toast } = vi.hoisted(() => ({
  leaveGroup: vi.fn(),
  requestMembership: vi.fn(),
  withdrawMembershipRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/group/api/leaveGroup", () => ({ leaveGroup }))
vi.mock("@/features/group/api/membershipRequestMutations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestMembership,
  withdrawMembershipRequest,
}))
vi.mock("sonner", () => ({ toast }))
vi.mock("@/features/group/api/groupMembershipQueryOptions", () => ({
  groupMembershipQueryOptions: (id: string) => ({
    queryKey: ["groups", "detail", id, "membership"],
    queryFn: () => Promise.resolve({ isMember: server.role !== null, role: server.role }),
  }),
}))
vi.mock("@/features/group/api/membershipRequestQueryOptions", () => ({
  myMembershipRequestQueryOptions: (id: string, userId: string) => ({
    queryKey: ["groups", "detail", id, "my-request", userId],
    queryFn: () => Promise.resolve({ request: server.request, violations: server.violations }),
  }),
  pendingMembershipRequestsQueryOptions: (id: string) => ({
    queryKey: ["groups", "detail", id, "requests"],
    queryFn: () => Promise.resolve([{ id: "r1" }, { id: "r2" }]),
  }),
  groupMembersQueryOptions: (id: string) => ({
    queryKey: ["groups", "detail", id, "members"],
    queryFn: () =>
      Promise.resolve(
        Array.from({ length: 9 }, (_, index) => ({
          userId: `u${index}`,
          name: `Člen ${index}`,
          image: null,
          role: index === 0 ? "OWNER" : "MEMBER",
          joinedAt: new Date(2026, 0, 1),
        })),
      ),
  }),
}))

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

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

const pending: MembershipRequest = {
  id: "r1",
  groupId: "g1",
  status: "PENDING",
  message: null,
  requestedAt: new Date(2026, 0, 2),
}

// What the route does: it owns the session and the sheet, and composes the page.
function Page({ userId }: { userId: string | null }) {
  const membership = useGroupMembershipState(group.id, { userId, isPending: false })
  const requests = useQuery({
    ...pendingMembershipRequestsQueryOptions(group.id),
    enabled: membership.isAdmin,
  })
  const members = useQuery({ ...groupMembersQueryOptions(group.id), enabled: membership.isAdmin })
  const [step, setStep] = useState<MembershipSheetStep | null>(null)
  return (
    <>
      <GroupDetail
        group={group}
        activityLabel="Florbal"
        membershipPanel={
          <GroupMembershipPanel
            membership={membership}
            groupName={group.name}
            from="%2Fgroups%2Fg1"
            onRequest={() => setStep("form")}
            onWithdraw={() => setStep("withdraw")}
          />
        }
        adminPanel={
          membership.isAdmin ? (
            <GroupAdminPanel
              groupId={group.id}
              pendingCount={requests.data?.length}
            />
          ) : undefined
        }
        membersPreview={
          membership.isAdmin && members.data ? (
            <GroupMembersPreview
              groupId={group.id}
              members={members.data}
            />
          ) : undefined
        }
      />
      {userId ? (
        <MembershipRequestSheet
          groupId={group.id}
          applicant={{ name: "Fresh Duckling", isEmailVerified: true }}
          step={step}
          onStepChange={setStep}
        />
      ) : null}
    </>
  )
}

// Disabled while the user's state loads; the same label, so wait for it to work.
const requestButton = async () => {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Požádat o členství" })).toBeEnabled(),
  )
  return screen.getByRole("button", { name: "Požádat o členství" })
}

const renderDetail = (userId: string | null) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Page userId={userId} />
    </QueryClientProvider>,
  )

describe("GroupDetail", () => {
  beforeEach(() => {
    server.role = null
    server.request = null
    server.violations = []
    leaveGroup.mockReset()
    leaveGroup.mockResolvedValue(undefined)
    requestMembership.mockReset()
    withdrawMembershipRequest.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("shows a visitor the basics, the member count and a way to sign up", async () => {
    await renderDetail(null)

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
    await renderDetail(null)

    expect(screen.getByRole("heading", { name: "Nadcházející akce" })).toBeInTheDocument()
    expect(screen.getByText(/Na této funkci právě pracujeme/)).toBeVisible()
  })

  describe("asking to join", () => {
    it("sends a request with a message and shows it waiting", async () => {
      const user = userEvent.setup()
      requestMembership.mockImplementation(() => {
        server.request = pending
        server.violations = ["ALREADY_REQUESTED"]
        return Promise.resolve(pending)
      })
      await renderDetail("u1")

      await user.click(await requestButton())
      expect(screen.getByText(/Organizátor žádost schválí ručně/)).toBeVisible()
      const dialog = await screen.findByRole("dialog")
      expect(within(dialog).getByText("Fresh Duckling")).toBeVisible()
      await user.type(within(dialog).getByLabelText(/Zpráva organizátorovi/), "  Ahoj  ")
      await user.click(within(dialog).getByRole("button", { name: "Odeslat žádost" }))

      expect(await within(dialog).findByText(/Jak dopadla, uvidíte tady/)).toBeVisible()
      expect(requestMembership.mock.calls[0]?.[0]).toEqual({ groupId: "g1", message: "Ahoj" })
      await user.click(within(dialog).getByRole("button", { name: "Hotovo" }))

      expect(await screen.findByText(/čeká, až ji organizátor skupiny vyřídí/)).toBeVisible()
      expect(screen.queryByRole("button", { name: "Požádat o členství" })).not.toBeInTheDocument()
    })

    it("explains a refusal in the form", async () => {
      const user = userEvent.setup()
      const { MembershipRefusedError } =
        await import("@/features/group/api/membershipRequestMutations")
      requestMembership.mockRejectedValue(new MembershipRefusedError(["REJECTED_BEFORE"]))
      await renderDetail("u1")

      await user.click(await requestButton())
      const dialog = await screen.findByRole("dialog")
      await user.click(within(dialog).getByRole("button", { name: "Odeslat žádost" }))

      expect(await within(dialog).findByText(/Organizátor vaši žádost zamítl/)).toBeInTheDocument()
      expect(requestMembership.mock.calls[0]?.[0]).toEqual({ groupId: "g1", message: undefined })
    })

    it("withdraws a waiting request after asking", async () => {
      const user = userEvent.setup()
      server.request = pending
      server.violations = ["ALREADY_REQUESTED"]
      withdrawMembershipRequest.mockImplementation(() => {
        server.request = null
        server.violations = []
        return Promise.resolve()
      })
      await renderDetail("u1")

      await user.click(await screen.findByRole("button", { name: "Zrušit žádost" }))
      const dialog = await screen.findByRole("dialog")
      expect(within(dialog).getByText("Zrušit žádost o členství?")).toBeVisible()
      await user.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

      await waitFor(() => expect(withdrawMembershipRequest.mock.calls[0]?.[0]).toBe("g1"))
      expect(toast.success).toHaveBeenCalledWith("Žádost zrušena")
      expect(await screen.findByRole("button", { name: "Požádat o členství" })).toBeVisible()
    })

    it("tells a rejected applicant they cannot ask again (ADR-0014)", async () => {
      server.request = { ...pending, status: "REJECTED" }
      server.violations = ["REJECTED_BEFORE"]
      await renderDetail("u1")

      expect(await screen.findByText("Zamítnuto")).toBeVisible()
      expect(screen.getByText(/novou žádost poslat nejde/)).toBeVisible()
      expect(screen.queryByRole("button", { name: "Požádat o členství" })).not.toBeInTheDocument()
    })
  })

  describe("a member", () => {
    it("sees their state instead of the button", async () => {
      server.role = "MEMBER"
      await renderDetail("u1")

      expect(await screen.findByText("Jste členem")).toBeVisible()
      expect(screen.queryByRole("button", { name: "Požádat o členství" })).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: /Správa skupiny/ })).not.toBeInTheDocument()
    })

    it("asks before leaving, and stays when the user changes their mind", async () => {
      const user = userEvent.setup()
      server.role = "MEMBER"
      await renderDetail("u1")

      await user.click(await screen.findByRole("button", { name: "Odejít ze skupiny" }))
      const dialog = await screen.findByRole("dialog")
      expect(dialog).toHaveTextContent("Opravdu chcete odejít ze skupiny?")
      await user.click(within(dialog).getByRole("button", { name: "Zůstat ve skupině" }))

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      expect(leaveGroup).not.toHaveBeenCalled()
    })

    it("leaves once the user confirms", async () => {
      const user = userEvent.setup()
      server.role = "MEMBER"
      await renderDetail("u1")

      await user.click(await screen.findByRole("button", { name: "Odejít ze skupiny" }))
      server.role = null
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Odejít" }),
      )

      await waitFor(() => expect(leaveGroup).toHaveBeenCalledWith("g1"))
      expect(await screen.findByRole("button", { name: "Požádat o členství" })).toBeInTheDocument()
    })

    it("keeps the dialog open and says so when leaving fails", async () => {
      const user = userEvent.setup()
      server.role = "MEMBER"
      leaveGroup.mockRejectedValue(new Error("nope"))
      await renderDetail("u1")

      await user.click(await screen.findByRole("button", { name: "Odejít ze skupiny" }))
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Odejít" }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent("Ze skupiny se nepodařilo odejít")
      expect(screen.getByRole("dialog")).toBeVisible()
    })
  })

  describe("an admin", () => {
    it.each(["OWNER", "ADMIN"] as const)(
      "%s sees the way to the requests and the members",
      async (role) => {
        server.role = role
        await renderDetail("u1")

        expect(await screen.findByRole("link", { name: "Žádosti o členství (2)" })).toHaveAttribute(
          "href",
          "/groups/g1/members?tab=requests",
        )
        expect(await screen.findByRole("heading", { name: "Členové (9)" })).toBeVisible()
        const members = screen.getByRole("link", { name: "Zobrazit všechny členy" })
        expect(members).toHaveAttribute("href", "/groups/g1/members")
        expect(within(members).getByText("+2")).toBeVisible()
      },
    )

    it("does not offer the owner a way out", async () => {
      server.role = "OWNER"
      await renderDetail("u1")

      expect(await screen.findByText("Jste členem")).toBeVisible()
      expect(screen.queryByRole("button", { name: "Odejít ze skupiny" })).not.toBeInTheDocument()
    })
  })
})
