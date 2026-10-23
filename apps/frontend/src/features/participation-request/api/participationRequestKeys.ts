export const participationRequestKeys = {
  all: () => ["participation-requests"] as const,
  // Per user too, so the next person signing in on this device never sees the
  // request state of the one before.
  mine: (eventId: string, userId: string) =>
    [...participationRequestKeys.all(), "mine", eventId, userId] as const,
}
