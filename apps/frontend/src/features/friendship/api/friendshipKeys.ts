export const friendshipKeys = {
  all: () => ["friendship"] as const,
  search: (text: string) => [...friendshipKeys.all(), "search", text] as const,
}
