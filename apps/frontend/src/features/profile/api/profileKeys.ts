import { profileRootKey } from "@/lib/friend-requests"

export const profileKeys = {
  // The root a friend request decision refreshes too (lib/friend-requests).
  all: () => profileRootKey,
  me: () => [...profileKeys.all(), "me"] as const,
  user: (userId: string) => [...profileKeys.all(), "user", userId] as const,
}
