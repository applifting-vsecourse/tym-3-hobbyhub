// Shared keys of the landing page's rows (#215). Lives in lib/ so the event and
// participation-request features can invalidate it after a change the rows
// show (a seat taken or given up, a request, an edited event), without
// importing the landing feature.
export const landingKeys = {
  all: () => ["landing"] as const,
  // The rows depend on who asks (their friends, their activities) and, for a
  // visitor, on the city they picked.
  rows: (viewerId: string | null, city: string | null) =>
    [...landingKeys.all(), "rows", viewerId, city] as const,
  freeCount: () => [...landingKeys.all(), "free-count"] as const,
}
