export const groupKeys = {
  all: () => ["groups"] as const,
  lists: () => [...groupKeys.all(), "list"] as const,
  mine: () => [...groupKeys.lists(), "mine"] as const,
  nearby: () => [...groupKeys.lists(), "nearby"] as const,
  discover: () => [...groupKeys.lists(), "discover"] as const,
  details: () => [...groupKeys.all(), "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
}
