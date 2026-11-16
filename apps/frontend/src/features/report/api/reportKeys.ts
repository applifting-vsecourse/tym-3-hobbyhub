export const reportKeys = {
  all: () => ["reports"] as const,
  reasons: () => [...reportKeys.all(), "reasons"] as const,
}
