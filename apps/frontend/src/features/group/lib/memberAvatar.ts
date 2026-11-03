import { AVATAR_KINDS, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"

/**
 * People are drawn as illustrations, never photos (DESIGN.md), so each member
 * gets one picked from their id: the same person keeps the same figure on
 * every screen.
 */
export function memberAvatar(userId: string): AvatarKind {
  let hash = 0
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_KINDS[hash % AVATAR_KINDS.length] ?? "florbalista"
}
