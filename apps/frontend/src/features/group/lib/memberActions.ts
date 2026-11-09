import type { GroupRole } from "@/features/group/api/groupSchemas"
import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"

/** What one member may do to another in member management (F-07.3b). */
export type MemberAction = "makeAdmin" | "demote" | "transfer" | "remove"

/**
 * The menu of a member's row: a mirror of the server's `memberActionViolations`
 * (ADR-0007), so the menu offers only what the server will do. An admin
 * removes members; only the owner names, demotes or removes admins and hands
 * the group over; nobody acts on the owner or on themselves.
 */
export function memberActions(
  me: { userId: string; role: GroupRole },
  member: GroupMember,
): MemberAction[] {
  if (member.userId === me.userId || member.role === "OWNER") return []
  if (me.role === "OWNER") {
    return [member.role === "ADMIN" ? "demote" : "makeAdmin", "transfer", "remove"]
  }
  if (me.role === "ADMIN" && member.role === "MEMBER") return ["remove"]
  return []
}
