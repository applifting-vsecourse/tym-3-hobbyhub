import { z } from "zod"

import { HTTPError } from "@/lib/api-client"
import { NICKNAME_MESSAGES } from "@/lib/nickname"

// #212: why the server refused a new nickname (profile/services on the
// backend). It answers 400 with the codes as the message.
const NICKNAME_REFUSALS = [
  "NICKNAME_TAKEN",
  "NICKNAME_CHANGE_TOO_SOON",
  "NICKNAME_RESERVED",
  "NICKNAME_INVALID",
  "NICKNAME_TOO_SHORT",
  "NICKNAME_TOO_LONG",
] as const

export type NicknameRefusal = (typeof NICKNAME_REFUSALS)[number]

/** Translation keys of the message for each refusal. */
export const NICKNAME_REFUSAL_MESSAGES = {
  NICKNAME_TAKEN: "nickname.taken",
  NICKNAME_CHANGE_TOO_SOON: "nickname.changeTooSoon",
  NICKNAME_RESERVED: NICKNAME_MESSAGES.reserved,
  NICKNAME_INVALID: NICKNAME_MESSAGES.invalid,
  NICKNAME_TOO_SHORT: NICKNAME_MESSAGES.tooShort,
  NICKNAME_TOO_LONG: NICKNAME_MESSAGES.tooLong,
} as const satisfies Record<NicknameRefusal, string>

const refusalSchema = z.object({ message: z.array(z.string()) })

/** The nickname refusal in a failed profile save, or null for any other failure. */
export function nicknameRefusalOf(error: unknown): NicknameRefusal | null {
  if (!(error instanceof HTTPError) || error.response.status !== 400) return null
  // ky has already read the body into `error.data`.
  const body = refusalSchema.safeParse(error.data)
  if (!body.success) return null
  return NICKNAME_REFUSALS.find((code) => body.data.message.includes(code)) ?? null
}
