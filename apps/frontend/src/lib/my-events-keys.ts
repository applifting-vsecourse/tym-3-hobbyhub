// Shared keys of the "my events" overview (F-06.3). Lives in lib/ so the event
// and participation-request features can both invalidate it after they change
// something the overview shows, without importing each other.
export const myEventsKeys = {
  all: () => ["my-events"] as const,
  // Per user, so the next person signing in on this device never sees the
  // overview of the one before.
  applications: (userId: string) => [...myEventsKeys.all(), "applications", userId] as const,
  hosted: (userId: string) => [...myEventsKeys.all(), "hosted", userId] as const,
}
