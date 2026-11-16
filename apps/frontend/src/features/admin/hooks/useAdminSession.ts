import { useQuery } from "@tanstack/react-query"

import { adminSessionQueryOptions } from "@/features/admin/api/adminSessionQueryOptions"

export function useAdminSession() {
  const { data } = useQuery(adminSessionQueryOptions())
  return { administrator: data?.administrator ?? null }
}
