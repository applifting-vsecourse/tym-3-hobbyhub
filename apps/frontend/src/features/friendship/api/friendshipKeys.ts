import { friendshipRootKey } from "@/lib/friend-requests"

export const friendshipKeys = {
  all: () => friendshipRootKey,
  search: (text: string) => [...friendshipKeys.all(), "search", text] as const,
  // #228: the requests waiting for me, newest first.
  received: () => [...friendshipKeys.all(), "received"] as const,
  // #228: just their number, for the tab.
  // #226: my friends, in the chosen order.
  list: (sort: string) => [...friendshipKeys.all(), "list", sort] as const,
  // #226: just their number, for the tab.
  count: () => [...friendshipKeys.all(), "count"] as const,
  receivedCount: () => [...friendshipKeys.all(), "received-count"] as const,
}
