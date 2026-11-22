export const userBlockKeys = {
  all: () => ["blocks"] as const,
  mine: () => [...userBlockKeys.all(), "mine"] as const,
}
