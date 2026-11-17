import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupRole } from "@/features/group/api/groupSchemas"
import type { GroupMemberListItem } from "@/features/group/api/membershipRequestSchemas"
import { GroupMemberList } from "@/features/group/components/GroupMemberList"

const { changeMemberRole, removeMember, transferOwnership, toast } = vi.hoisted(() => ({
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/group/api/memberManagement", () => ({
  changeMemberRole,
  removeMember,
  transferOwnership,
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

beforeEach(() => {
  changeMemberRole.mockReset().mockResolvedValue(undefined)
  removeMember.mockReset().mockResolvedValue(undefined)
  transferOwnership.mockReset().mockResolvedValue(undefined)
  toast.success.mockReset()
})

const aMember = (overrides: Partial<GroupMemberListItem>): GroupMemberListItem => ({
  userId: "u1",
  name: "Caffeinated Duck",
  image: null,
  role: "MEMBER",
  joinedAt: new Date(2026, 0, 1),
  relation: "none",
  ...overrides,
})

const members = [
  aMember({ userId: "owner", name: "Caffeinated Duck", role: "OWNER" }),
  aMember({ userId: "admin", name: "Quackmaster", role: "ADMIN" }),
  aMember({ userId: "member", name: "Deep Duck Thoughts", role: "MEMBER" }),
]

const renderList = (
  me?: { userId: string; role: GroupRole },
  renderFriendship?: (member: GroupMemberListItem) => ReactNode,
) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <GroupMemberList
        groupId="g1"
        groupName="Čtvrteční florbalisté"
        members={members}
        me={me}
        renderFriendship={renderFriendship}
      />
    </QueryClientProvider>,
  )

const menuOf = (name: string) => screen.queryByRole("button", { name: `Akce pro člena ${name}` })

describe("GroupMemberList", () => {
  it("lists the members with their role", async () => {
    await renderList()

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText("Organizátor")).toBeVisible()
    expect(within(items[1]!).getByText("Správce")).toBeVisible()
    expect(within(items[2]!).getByText("Člen")).toBeVisible()
    // The row (photo, name and role) opens the member's profile.
    expect(within(items[2]!).getByRole("link", { name: /Deep Duck Thoughts/ })).toHaveAttribute(
      "href",
      "/profile/member",
    )
  })

  it("gives a plain member no menus", async () => {
    await renderList({ userId: "member", role: "MEMBER" })

    expect(screen.queryAllByRole("button", { name: /Akce pro člena/ })).toHaveLength(0)
  })

  it("lets an admin act on members only, not on admins or the owner", async () => {
    await renderList({ userId: "admin", role: "ADMIN" })

    expect(menuOf("Deep Duck Thoughts")).toBeInTheDocument()
    expect(menuOf("Quackmaster")).not.toBeInTheDocument()
    expect(menuOf("Caffeinated Duck")).not.toBeInTheDocument()
  })

  it("removes a member once the admin confirms", async () => {
    const user = userEvent.setup()
    await renderList({ userId: "admin", role: "ADMIN" })

    await user.click(menuOf("Deep Duck Thoughts")!)
    await user.click(await screen.findByRole("menuitem", { name: "Odebrat ze skupiny" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(
      "Deep Duck Thoughts přestane být členem skupiny Čtvrteční florbalisté",
    )
    await user.click(within(dialog).getByRole("button", { name: "Odebrat" }))

    await waitFor(() =>
      expect(removeMember).toHaveBeenCalledWith({ groupId: "g1", userId: "member" }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith("Deep Duck Thoughts už není členem skupiny.")
  })

  it("offers the owner every action on an admin", async () => {
    const user = userEvent.setup()
    await renderList({ userId: "owner", role: "OWNER" })

    await user.click(menuOf("Quackmaster")!)
    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Odvolat správce",
      "Předat správu",
      "Odebrat ze skupiny",
    ])
  })

  it("names an admin once the owner confirms", async () => {
    const user = userEvent.setup()
    await renderList({ userId: "owner", role: "OWNER" })

    await user.click(menuOf("Deep Duck Thoughts")!)
    await user.click(await screen.findByRole("menuitem", { name: "Jmenovat správcem" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Jmenovat správcem" }),
    )

    await waitFor(() =>
      expect(changeMemberRole).toHaveBeenCalledWith({
        groupId: "g1",
        userId: "member",
        role: "ADMIN",
      }),
    )
  })

  it("hands the group over once the owner confirms", async () => {
    const user = userEvent.setup()
    await renderList({ userId: "owner", role: "OWNER" })

    await user.click(menuOf("Quackmaster")!)
    await user.click(await screen.findByRole("menuitem", { name: "Předat správu" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Předat správu" }),
    )

    await waitFor(() =>
      expect(transferOwnership).toHaveBeenCalledWith({ groupId: "g1", userId: "admin" }),
    )
  })

  it("keeps the sheet open and says so when the action fails", async () => {
    const user = userEvent.setup()
    removeMember.mockRejectedValue(new Error("nope"))
    await renderList({ userId: "owner", role: "OWNER" })

    await user.click(menuOf("Deep Duck Thoughts")!)
    await user.click(await screen.findByRole("menuitem", { name: "Odebrat ze skupiny" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Odebrat" }),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent("Akci se nepodařilo provést")
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  // #225: from a group to a member's profile, where a friend request goes.
  it("leads from each member to their profile", async () => {
    await renderList({ userId: "member", role: "MEMBER" })

    expect(screen.getByRole("link", { name: /Quackmaster/ })).toHaveAttribute(
      "href",
      "/profile/admin",
    )
  })

  it("shows my friendship with every member but me", async () => {
    await renderList({ userId: "member", role: "MEMBER" }, (member) => (
      <span>{`friendship:${member.userId}:${member.relation}`}</span>
    ))

    expect(screen.getByText("friendship:owner:none")).toBeInTheDocument()
    expect(screen.getByText("friendship:admin:none")).toBeInTheDocument()
    expect(screen.queryByText(/friendship:member/)).toBeNull()
  })
})
