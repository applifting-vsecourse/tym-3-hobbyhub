import ky from "ky"

import { env } from "@/config/env"
import { queryClient } from "@/config/react-query"
import { readableNestError } from "@/lib/api-client"

import { adminKeys } from "@/features/admin/api/adminKeys"

// #238: `/api/admin/*` with the admin cookie. Its own client: a 401 here means
// the administrator's session ended, which says nothing about the app's user
// session that `api` looks after.
export const adminApi = ky.create({
  prefix: `${env.VITE_API_URL}/admin`,
  credentials: "include",
  retry: { limit: 0 },
  hooks: {
    beforeError: [readableNestError],
    afterResponse: [
      ({ response }) => {
        if (response.status === 401) {
          void queryClient.invalidateQueries({ queryKey: adminKeys.session() })
        }
      },
    ],
  },
})
