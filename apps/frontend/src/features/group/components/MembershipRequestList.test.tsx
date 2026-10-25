import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { MembershipRefusedError } from "@/features/group/api/membershipRequestMutations"
import type {
  GroupMember,
  PendingMembershipRequest,
} from "@/features/group/api/membershipRequestSchemas"
import { GroupMemberList } from "@/features/group/components/GroupMemberList"
import { MembershipRequestList } from "@/features/group/components/MembershipRequestList"

const { decideMembershipRequest, toast } = vi.hoisted(() => ({
  decideMembershipRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/group/api/membershipRequestMutations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  decideMembershipRequest,
}))
vi.mock("sonner", () => ({ toast }))

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const aRequest = (overrides: Partial<PendingMembershipRequest> = {}): PendingMembershipRequest => ({
  id: "r1",
  groupId: "g1",
  status: "PENDING",
  message: "Hraju třetí rok za firemní tým.",
  requestedAt: new Date(2026, 0, 2),
  applicant: {
    name: "Honza K",
    image: null,
    bio: "Florbal hraju od školy.",
    hasVerifiedEmail: true,
  },
  ...overrides,
})

const renderList = (requests: PendingMembershipRequest[]) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <MembershipRequestList
        groupId="g1"
        requests={requests}
        memberCount={14}
      />
    </QueryClientProvider>,
  )

describe("MembershipRequestList", () => {
  beforeEach(() => {
    decideMembershipRequest.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("says so when no request is waiting", async () => {
    await renderList([])

    expect(screen.getByText(/Žádné žádosti o členství nečekají/)).toBeVisible()
  })

  it("shows who asks, their message and what approval changes", async () => {
    await renderList([aRequest()])

    expect(screen.getByRole("heading", { name: "Honza K" })).toBeVisible()
    expect(screen.getByText("Ověřený e-mail")).toBeVisible()
    expect(screen.getByText("Hraju třetí rok za firemní tým.")).toBeVisible()
    expect(screen.getByText("Florbal hraju od školy.")).toBeVisible()
    // Initials stand in until the applicant adds a photo.
    expect(screen.getByText("HK")).toBeInTheDocument()
    expect(screen.getByText("Po schválení bude 15 členů.")).toBeVisible()
  })

  it("approves a request", async () => {
    const user = userEvent.setup()
    decideMembershipRequest.mockResolvedValue(aRequest({ status: "APPROVED" }))
    await renderList([aRequest()])

    await user.click(screen.getByRole("button", { name: "Schválit" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Honza K je teď členem skupiny."),
    )
    expect(decideMembershipRequest.mock.calls[0]?.[0]).toEqual({
      groupId: "g1",
      requestId: "r1",
      decision: "approve",
    })
  })

  it("rejects a request with the reason, after asking", async () => {
    const user = userEvent.setup()
    decideMembershipRequest.mockResolvedValue(aRequest({ status: "REJECTED" }))
    await renderList([aRequest()])

    await user.click(screen.getByRole("button", { name: "Zamítnout" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Honza K uvidí zamítnutí/)).toBeVisible()
    await user.type(within(dialog).getByLabelText(/Důvod/), "  Skupina je plná  ")
    await user.click(within(dialog).getByRole("button", { name: "Zamítnout" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zamítnuta"))
    expect(decideMembershipRequest.mock.calls[0]?.[0]).toEqual({
      groupId: "g1",
      requestId: "r1",
      decision: "reject",
      reason: "Skupina je plná",
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("keeps the reason when rejecting fails for another reason", async () => {
    const user = userEvent.setup()
    decideMembershipRequest.mockRejectedValue(new Error("offline"))
    await renderList([aRequest()])

    await user.click(screen.getByRole("button", { name: "Zamítnout" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(/Důvod/), "Skupina je plná")
    await user.click(within(dialog).getByRole("button", { name: "Zamítnout" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Žádost se nepodařilo vyřídit. Zkuste to prosím znovu.",
      ),
    )
    expect(screen.getByRole("dialog")).toBeVisible()
    expect(within(dialog).getByLabelText(/Důvod/)).toHaveValue("Skupina je plná")
  })

  it("says what changed when another admin got there first", async () => {
    const user = userEvent.setup()
    decideMembershipRequest.mockRejectedValue(new MembershipRefusedError(["NOT_PENDING"]))
    await renderList([aRequest()])

    await user.click(screen.getByRole("button", { name: "Schválit" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Žádost mezitím vyřídil jiný správce, nebo ji žadatel zrušil.",
      ),
    )
  })
})

describe("GroupMemberList", () => {
  const aMember = (overrides: Partial<GroupMember>): GroupMember => ({
    userId: "u1",
    name: "Caffeinated Duck",
    image: null,
    role: "MEMBER",
    joinedAt: new Date(2026, 0, 1),
    ...overrides,
  })

  it("lists the members with their role", async () => {
    await renderWithRouter(
      <GroupMemberList
        members={[
          aMember({ userId: "u1", name: "Caffeinated Duck", role: "OWNER" }),
          aMember({ userId: "u2", name: "Deep Duck Thoughts", role: "MEMBER" }),
        ]}
      />,
    )

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText("Organizátor")).toBeVisible()
    expect(within(items[1]!).getByText("Člen")).toBeVisible()
  })
})
