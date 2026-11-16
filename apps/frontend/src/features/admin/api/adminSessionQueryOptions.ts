import { queryOptions } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { adminAuthClient } from "@/features/admin/lib/admin-auth-client"

export type AdminSession = {
  administrator: { id: string; email: string; name: string }
} | null

export const adminSessionQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.session(),
    queryFn: async (): Promise<AdminSession> => {
      const { data, error } = await adminAuthClient.getSession()
      if (error) throw new Error(error.message ?? "Failed to load session")
      if (!data?.user) return null
      const { id, email, name } = data.user
      return { administrator: { id, email, name } }
    },
    staleTime: 30_000,
  })
