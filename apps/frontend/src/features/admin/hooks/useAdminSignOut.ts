import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { adminAuthClient } from "@/features/admin/lib/admin-auth-client"

export function useAdminSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: async () => {
      const { error } = await adminAuthClient.signOut()
      if (error) throw new Error(error.message ?? "Admin sign-out failed")
    },
    onSuccess: async () => {
      // Everything the administration loaded is private data: drop all of it.
      queryClient.removeQueries({ queryKey: adminKeys.all() })
      await navigate({ to: ROUTES.adminLogin })
    },
    onError: () => {
      toast.error(t("admin.signOut.failed"))
    },
  })
}
