export const groupKeys = {
  all: () => ["groups"] as const,
  lists: () => [...groupKeys.all(), "list"] as const,
  mine: () => [...groupKeys.lists(), "mine"] as const,
  nearby: () => [...groupKeys.lists(), "nearby"] as const,
  // A signed-in viewer does not see their own groups, a visitor sees them all.
  discover: (viewerId: string | null) => [...groupKeys.lists(), "discover", viewerId] as const,
  details: () => [...groupKeys.all(), "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
}
