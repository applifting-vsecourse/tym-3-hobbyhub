export const eventInterestKeys = {
  all: () => ["event-interest"] as const,
  // Per user, so the next person signing in on this device never sees the
  // list of the one before.
  state: (eventId: string, userId: string) =>
    [...eventInterestKeys.all(), eventId, userId] as const,
}
