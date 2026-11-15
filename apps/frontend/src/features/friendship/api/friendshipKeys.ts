export const friendshipKeys = {
  all: () => ["friendship"] as const,
  search: (text: string) => [...friendshipKeys.all(), "search", text] as const,
  // #228: the requests waiting for me, newest first.
  received: () => [...friendshipKeys.all(), "received"] as const,
}
