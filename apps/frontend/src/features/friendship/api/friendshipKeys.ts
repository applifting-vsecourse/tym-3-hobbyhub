import { friendshipRootKey } from "@/lib/friend-requests"

export const friendshipKeys = {
  all: () => friendshipRootKey,
  search: (text: string) => [...friendshipKeys.all(), "search", text] as const,
  // #228: the requests waiting for me, newest first.
  received: () => [...friendshipKeys.all(), "received"] as const,
  // #228: just their number, for the tab.
  receivedCount: () => [...friendshipKeys.all(), "received-count"] as const,
}
