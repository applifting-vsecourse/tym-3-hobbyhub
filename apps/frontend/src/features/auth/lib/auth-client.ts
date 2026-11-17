import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { env } from "@/config/env"

export const authClient = createAuthClient({
  baseURL: env.VITE_BETTER_AUTH_URL,
  plugins: [
    usernameClient(),
    // #262: the account's language (CS / EN) comes with the session and is
    // sent with the sign-up; the backend's registration hook checks it.
    inferAdditionalFields({
      user: { preferredLanguage: { type: "string", required: false } },
    }),
  ],
})
