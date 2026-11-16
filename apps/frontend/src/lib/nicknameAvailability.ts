import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { normalizeNickname } from "@/lib/nickname"

const availabilitySchema = z.object({ available: z.boolean() })

// #212: asks BetterAuth's username plugin (mounted under /api/auth) whether
// nobody has the nickname yet, letter case aside. Only a hint while typing:
// the server checks again when the form is sent. Shared by the sign-up and
// the profile, hence here and not through the auth feature's client.
export const nicknameAvailabilityQueryOptions = (nickname: string) =>
  queryOptions({
    queryKey: ["nickname-availability", normalizeNickname(nickname)] as const,
    queryFn: async () => {
      const json = await api
        .post("auth/is-username-available", { json: { username: nickname } })
        .json()
      return availabilitySchema.parse(json).available
    },
    staleTime: 30_000,
    retry: false,
  })
