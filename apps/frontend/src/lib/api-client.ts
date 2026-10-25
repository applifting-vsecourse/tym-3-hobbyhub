import ky, { HTTPError } from "ky"
import { z } from "zod"

import { env } from "@/config/env"
import { queryClient } from "@/config/react-query"
import { authKeys } from "@/lib/auth-keys"

// Single shared HTTP client. Per the Applifting frontend playbook:
// - send credentials so better-auth's session cookie travels with every request
// - on 401 invalidate the auth session query so route loaders re-resolve auth
//   and redirect through the login flow
// - turn API errors into readable messages (see beforeError below)
//
// Paths are joined onto `prefix`, and a leading slash is normalised away, so
// both `api.get("quacks")` and `api.get("/quacks")` hit the same endpoint.
// What NestJS answers with on a failure, e.g. a refused validation.
const nestErrorSchema = z.object({ message: z.union([z.string(), z.array(z.string())]) })

export const api = ky.create({
  prefix: env.VITE_API_URL,
  credentials: "include",
  retry: { limit: 0 },
  hooks: {
    // NestJS returns { message: string | string[] } on validation failures.
    // Without this the user would see ky's generic "Request failed with status
    // code 400" and never learn what was actually wrong. ky has already read
    // the body into `error.data`; the response itself can no longer be read.
    beforeError: [
      ({ error }) => {
        if (!(error instanceof HTTPError)) return error
        const body = nestErrorSchema.safeParse(error.data)
        // No JSON body with a message: keep ky's default message.
        if (!body.success) return error
        const { message } = body.data
        const text = Array.isArray(message) ? message.join(", ") : message
        if (text) error.message = text
        return error
      },
    ],
    afterResponse: [
      ({ response }) => {
        if (response.status === 401) {
          void queryClient.invalidateQueries({ queryKey: authKeys.session() })
        }
      },
    ],
  },
})

export { HTTPError }
