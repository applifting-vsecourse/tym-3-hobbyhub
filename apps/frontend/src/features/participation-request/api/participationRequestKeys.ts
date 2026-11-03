export const participationRequestKeys = {
  all: () => ["participation-requests"] as const,
  // Per user too, so the next person signing in on this device never sees the
  // request state of the one before.
  mine: (eventId: string, userId: string) =>
    [...participationRequestKeys.all(), "mine", eventId, userId] as const,
  // The organizer's list of waiting requests (F-05.7).
  pending: (eventId: string) => [...participationRequestKeys.all(), "pending", eventId] as const,
}
