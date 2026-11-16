import type { MyMembershipRequestSection } from "@/features/group/api/membershipRequestSchemas"

/** What narrows the discover list; empty text and no activities are no filter. */
export type DiscoverGroupsFilters = {
  activityIds: string[]
  search: string
  location: string
}

export const groupKeys = {
  all: () => ["groups"] as const,
  lists: () => [...groupKeys.all(), "list"] as const,
  mine: () => [...groupKeys.lists(), "mine"] as const,
  nearby: () => [...groupKeys.lists(), "nearby"] as const,
  // A signed-in viewer does not see their own groups, a visitor sees them all.
  // The filters are part of the key: each narrowing is its own list.
  discover: (viewerId: string | null, filters: DiscoverGroupsFilters) =>
    [...groupKeys.lists(), "discover", viewerId, filters] as const,
  // F-07.7, per user like `myRequest`. A list, so asking, withdrawing and a
  // decision refresh it with the others.
  myRequests: (userId: string, section: MyMembershipRequestSection) =>
    [...groupKeys.lists(), "my-requests", userId, section] as const,
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
