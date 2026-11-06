import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { groupKeys } from "@/features/group/api/groupKeys"
import type { MyMembershipRequest } from "@/features/group/api/membershipRequestSchemas"
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

// The list as the server sent it, so the tab renders without a request.
const renderRequests = (requests: MyMembershipRequest[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
  queryClient.setQueryData(groupKeys.myRequests("u1"), {
    pages: [{ items: requests, nextCursor: null }],
    pageParams: [null],
  })
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <MyMembershipRequests userId="u1" />
    </QueryClientProvider>,
  )
}

describe("MyMembershipRequests", () => {
  beforeEach(() => {
    withdrawMembershipRequest.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("points to Objevit when there are no requests", async () => {
    await renderRequests([])

    expect(screen.getByText(/Zatím jste o členství v žádné skupině nežádali/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Objevit" })).toBeVisible()
  })

  it("shows how each request stands, with its dates, reason and message", async () => {
    await renderRequests([
      aRequest({ message: "Hraju třetí rok." }),
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
    ])

    const [pending, rejected, withdrawn] = screen.getAllByRole("article")
    expect(within(pending!).getByText("Čeká na schválení")).toBeVisible()
    expect(within(pending!).getByText("Hraju třetí rok.")).toBeVisible()
    expect(within(pending!).getByRole("button", { name: "Zrušit žádost" })).toBeVisible()

    expect(within(rejected!).getByText("Zamítnuto")).toBeVisible()
    expect(within(rejected!).getByText(/Zamítnuto 4\. 11\. 2026/)).toBeVisible()
    expect(within(rejected!).getByText("Skupina je plná.")).toBeVisible()
    expect(within(rejected!).queryByRole("button")).not.toBeInTheDocument()

    expect(within(withdrawn!).getByText("Staženo")).toBeVisible()
    expect(within(withdrawn!).getByText(/Podáno 2\. 11\. 2026 · Staženo 3\. 11\. 2026/)).toBeVisible()
    // Neither was given: no empty label stands in for them.
    expect(within(withdrawn!).queryByText("Důvod zamítnutí")).not.toBeInTheDocument()
    expect(within(withdrawn!).queryByText("Vaše zpráva")).not.toBeInTheDocument()

    expect(screen.getByRole("link", { name: "Ranní běžci" })).toHaveAttribute(
      "href",
      "/groups/g2",
    )
  })

  it("says a request on a cancelled group will not be decided, without a link", async () => {
    await renderRequests([
      aRequest({
        status: "GROUP_CANCELLED",
        group: { id: "g1", name: "Čtvrteční florbalisté", isOpen: false },
      }),
    ])

    const card = screen.getByRole("article")
    expect(within(card).getByText("Skupina zrušena")).toBeVisible()
    expect(within(card).getByText(/žádost už nikdo nevyřídí/)).toBeVisible()
    expect(within(card).getByRole("heading", { name: "Čtvrteční florbalisté" })).toBeVisible()
    expect(within(card).queryByRole("link")).not.toBeInTheDocument()
    expect(within(card).queryByRole("button")).not.toBeInTheDocument()
  })

  it("withdraws a waiting request after asking", async () => {
    const user = userEvent.setup()
    withdrawMembershipRequest.mockResolvedValue(undefined)
    await renderRequests([aRequest()])

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
    await renderRequests([aRequest()])

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
