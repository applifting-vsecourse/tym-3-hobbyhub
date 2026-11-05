export const profileKeys = {
  all: () => ["profile"] as const,
  me: () => [...profileKeys.all(), "me"] as const,
  user: (userId: string) => [...profileKeys.all(), "user", userId] as const,
}
