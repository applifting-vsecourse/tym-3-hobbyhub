import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { groupKeys } from "@/features/group/api/groupKeys"
import type {
  MyMembershipRequest,
  MyMembershipRequestSection,
} from "@/features/group/api/membershipRequestSchemas"
import { MyMembershipRequests } from "@/features/group/components/MyMembershipRequests"

const { withdrawMembershipRequest, toast } = vi.hoisted(() => ({
  withdrawMembershipRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/group/api/membershipRequestMutations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withdrawMembershipRequest,
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

const aRequest = (overrides: Partial<MyMembershipRequest> = {}): MyMembershipRequest => ({
  id: "r1",
  status: "PENDING",
  message: null,
  requestedAt: new Date(2026, 10, 2),
  decidedAt: null,
  rejectionReason: null,
  group: { id: "g1", name: "Čtvrteční florbalisté", isOpen: true },
  ...overrides,
})

// Both sections as the server sent them, so the tab renders without a request.
const renderRequests = (
  sections: Partial<Record<MyMembershipRequestSection, MyMembershipRequest[]>>,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
  for (const section of ["pending", "history"] as const) {
    queryClient.setQueryData(groupKeys.myRequests("u1", section), {
      pages: [{ items: sections[section] ?? [], nextCursor: null }],
      pageParams: [null],
    })
  }
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <MyMembershipRequests userId="u1" />
    </QueryClientProvider>,
  )
}

const sectionNamed = (name: string) =>
  screen.getByRole("heading", { level: 2, name }).closest("section")!

describe("MyMembershipRequests", () => {
  beforeEach(() => {
    withdrawMembershipRequest.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("says what would appear in each empty section", async () => {
    await renderRequests({})

    const pending = sectionNamed("Čekající")
    expect(within(pending).getByText(/Žádná žádost nečeká na vyřízení/)).toBeVisible()
    expect(within(pending).getByRole("link", { name: "Objevit" })).toBeVisible()
    expect(
      within(sectionNamed("Historie")).getByText("Tady se objeví zamítnuté a stažené žádosti."),
    ).toBeVisible()
  })

  it("lists waiting requests without a status, and can withdraw them", async () => {
    await renderRequests({ pending: [aRequest({ message: "Hraju třetí rok." })] })

    const card = within(sectionNamed("Čekající")).getByRole("article")
    expect(within(card).queryByText("Čeká na schválení")).not.toBeInTheDocument()
    expect(within(card).getByText("Podáno 2. 11. 2026")).toBeVisible()
    expect(within(card).getByText("Hraju třetí rok.")).toBeVisible()
    expect(within(card).getByRole("button", { name: "Zrušit žádost" })).toBeVisible()
  })

  it("shows the history with a status, dates and reason, a withdrawn one at full contrast", async () => {
    await renderRequests({
      history: [
        aRequest({
          id: "r2",
          status: "REJECTED",
          decidedAt: new Date(2026, 10, 4),
          rejectionReason: "Skupina je plná.",
          group: { id: "g2", name: "Ranní běžci", isOpen: true },
        }),
        aRequest({
          id: "r3",
          status: "WITHDRAWN",
          decidedAt: new Date(2026, 10, 3),
          group: { id: "g3", name: "Volejbal Letná", isOpen: true },
        }),
      ],
    })

    const [rejected, withdrawn] = within(sectionNamed("Historie")).getAllByRole("article")
    expect(within(rejected!).getByText("Zamítnuto")).toBeVisible()
    expect(within(rejected!).getByText(/Zamítnuto 4\. 11\. 2026/)).toBeVisible()
    expect(within(rejected!).getByText("Skupina je plná.")).toBeVisible()
    expect(within(rejected!).queryByRole("button")).not.toBeInTheDocument()

    // The badge alone tells a withdrawn one apart; nothing dims its text.
    expect(withdrawn).not.toHaveClass("opacity-50")
    expect(within(withdrawn!).getByText("Staženo")).toBeVisible()
    expect(
      within(withdrawn!).getByText(/Podáno 2\. 11\. 2026 · Staženo 3\. 11\. 2026/),
    ).toBeVisible()
    // Neither was given: no empty label stands in for them.
    expect(within(withdrawn!).queryByText("Důvod zamítnutí")).not.toBeInTheDocument()
    expect(within(withdrawn!).queryByText("Vaše zpráva")).not.toBeInTheDocument()
    // A new request starts on the group's page, so the link stays.
    expect(within(withdrawn!).getByRole("link", { name: "Volejbal Letná" })).toHaveAttribute(
      "href",
      "/groups/g3",
    )
  })

  it("says a request on a cancelled group will not be decided, without a link", async () => {
    await renderRequests({
      history: [
        aRequest({
          status: "GROUP_CANCELLED",
          group: { id: "g1", name: "Čtvrteční florbalisté", isOpen: false },
        }),
      ],
    })

    const card = within(sectionNamed("Historie")).getByRole("article")
    expect(within(card).getByText("Skupina zrušena")).toBeVisible()
    expect(within(card).getByText(/žádost už nikdo nevyřídí/)).toBeVisible()
    expect(within(card).getByRole("heading", { name: "Čtvrteční florbalisté" })).toBeVisible()
    expect(within(card).queryByRole("link")).not.toBeInTheDocument()
    expect(within(card).queryByRole("button")).not.toBeInTheDocument()
  })

  it("withdraws a waiting request after asking", async () => {
    const user = userEvent.setup()
    withdrawMembershipRequest.mockResolvedValue(undefined)
    await renderRequests({ pending: [aRequest()] })

    await user.click(screen.getByRole("button", { name: "Zrušit žádost" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zrušena"))
    expect(withdrawMembershipRequest.mock.calls[0]?.[0]).toBe("g1")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("keeps the confirmation open when withdrawing fails", async () => {
    const user = userEvent.setup()
    withdrawMembershipRequest.mockRejectedValue(new Error("offline"))
    await renderRequests({ pending: [aRequest()] })

    await user.click(screen.getByRole("button", { name: "Zrušit žádost" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Žádost se nepodařilo zrušit. Zkuste to prosím znovu.",
      ),
    )
    expect(screen.getByRole("dialog")).toBeVisible()
  })
})
