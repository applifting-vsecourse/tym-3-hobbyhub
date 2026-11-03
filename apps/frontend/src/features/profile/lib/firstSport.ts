/**
 * The first sport of a person: the first by name. The profile and the edit
 * form use the same rule, so the default cover is the same before and after saving.
 */
export function firstSportIcon(
  activities: readonly { name: string; icon: string }[],
): string | undefined {
  return [...activities].sort((a, b) => a.name.localeCompare(b.name, "cs"))[0]?.icon
}
