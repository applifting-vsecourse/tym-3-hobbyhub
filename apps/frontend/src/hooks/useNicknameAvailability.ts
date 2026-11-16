import { useQuery } from "@tanstack/react-query"

import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { nicknameProblem, normalizeNickname } from "@/lib/nickname"
import { nicknameAvailabilityQueryOptions } from "@/lib/nicknameAvailability"

/** A pause in typing after which the server is asked. */
export const NICKNAME_CHECK_DELAY_MS = 400

/**
 * - `idle`: nothing to ask: the nickname breaks a rule the form shows itself,
 *   or it is the user's own.
 * - `checking`: the user is typing, or the answer is on its way.
 * - `unknown`: the server could not tell; the save checks it anyway.
 */
export type NicknameAvailability = "idle" | "checking" | "available" | "taken" | "unknown"

/**
 * #212: whether someone else already has the nickname being typed, asked a
 * moment after typing stops. `current` is the user's own nickname, which is
 * not "taken" even in another letter case.
 */
export function useNicknameAvailability(value: string, current?: string): NicknameAvailability {
  const nickname = value.trim()
  const isOwn = current !== undefined && normalizeNickname(nickname) === normalizeNickname(current)
  const isAskable = nicknameProblem(nickname) === null && !isOwn
  const debounced = useDebouncedValue(nickname, NICKNAME_CHECK_DELAY_MS)
  const query = useQuery({
    ...nicknameAvailabilityQueryOptions(debounced),
    enabled: isAskable && debounced === nickname,
  })

  if (!isAskable) return "idle"
  if (debounced !== nickname || query.isPending) return "checking"
  if (query.isError) return "unknown"
  return query.data ? "available" : "taken"
}
