import { createAuthClient } from "better-auth/react"

import { env } from "@/config/env"

// ADR-0010, #238: the administrators' sign-in, a separate BetterAuth instance
// with its own cookie. The whole URL, path included, because it is not the
// default `/api/auth`.
export const adminAuthClient = createAuthClient({
  baseURL: `${env.VITE_BETTER_AUTH_URL}/api/admin-auth`,
})
