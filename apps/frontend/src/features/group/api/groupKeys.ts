export const groupKeys = {
  all: () => ["groups"] as const,
  lists: () => [...groupKeys.all(), "list"] as const,
  mine: () => [...groupKeys.lists(), "mine"] as const,
  nearby: () => [...groupKeys.lists(), "nearby"] as const,
  // A signed-in viewer does not see their own groups, a visitor sees them all.
  discover: (viewerId: string | null) => [...groupKeys.lists(), "discover", viewerId] as const,
  details: () => [...groupKeys.all(), "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  membership: (id: string) => [...groupKeys.detail(id), "membership"] as const,
  // Per user too, so the next person signing in on this device never sees the
  // request of the one before.
  myRequest: (id: string, userId: string) =>
    [...groupKeys.detail(id), "my-request", userId] as const,
  // The admins' view (F-07.3); under the detail, so a decision refreshes the
  // member count with it.
  requests: (id: string) => [...groupKeys.detail(id), "requests"] as const,
  members: (id: string) => [...groupKeys.detail(id), "members"] as const,
}
