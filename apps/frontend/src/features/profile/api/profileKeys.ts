import { profileRootKey, profileUserKey } from "@/lib/friend-requests"

export const profileKeys = {
  // The root a friend request decision refreshes too (lib/friend-requests).
  all: () => profileRootKey,
  me: () => [...profileKeys.all(), "me"] as const,
  // The one a friend request decision refreshes (lib/friend-requests).
  user: profileUserKey,
}
