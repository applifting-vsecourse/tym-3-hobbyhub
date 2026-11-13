import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AdminTable } from "@/components/hobbyhub/AdminTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  useDeactivateAdministrator,
  useInviteAdministrator,
  useReactivateAdministrator,
  useResendInvitation,
} from "@/features/admin/api/administratorMutations"
import { administratorsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { Administrator, AdministratorStatus } from "@/features/admin/api/adminSchemas"
import { AdminState } from "@/features/admin/components/AdminState"
import { DeactivateAdministratorSheet } from "@/features/admin/components/DeactivateAdministratorSheet"
import { InviteAdministratorSheet } from "@/features/admin/components/InviteAdministratorSheet"
import { useAdminSession } from "@/features/admin/hooks/useAdminSession"
import { useAdminFormat } from "@/features/admin/lib/format"

const STATUS_BADGE: Record<AdministratorStatus, "success" | "pending" | "secondary"> = {
  ACTIVE: "success",
  INVITED: "pending",
  DEACTIVATED: "secondary",
}

/**
 * #237, ADR-0021: who runs the platform. Administrators invite colleagues by
 * e-mail, take their access away and give it back. Nobody removes
 * themselves, and the last active administrator stays.
 */
export function Administrators() {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(administratorsQueryOptions())
  const { administrator: me } = useAdminSession()
  const title = t("admin.administrators.title")

  const invite = useInviteAdministrator()
  const resend = useResendInvitation()
  const deactivate = useDeactivateAdministrator()
  const reactivate = useReactivateAdministrator()
  const [isInviting, setIsInviting] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<Administrator | null>(null)

  const activeCount = (query.data ?? []).filter((admin) => admin.status === "ACTIVE").length
  // Why "Odebrat" is not offered; null when it is.
  const removalBlockedBy = (admin: Administrator): string | null => {
    if (admin.id === me?.id) return t("admin.administrators.thatIsYou")
    if (admin.status === "ACTIVE" && activeCount <= 1) {
      return t("admin.administrators.lastActive")
    }
    return null
  }

  const actionsOf = (admin: Administrator) => {
    if (admin.status === "DEACTIVATED") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-9"
          disabled={reactivate.isPending}
          onClick={() =>
            reactivate.mutate(admin.id, {
              onSuccess: () => toast.success(t("admin.administrators.reactivated", admin)),
              onError: () => toast.error(t("admin.administrators.actionFailed")),
            })
          }
        >
          {t("admin.administrators.reactivate")}
        </Button>
      )
    }
    const blockedBy = removalBlockedBy(admin)
    return (
      <span className="flex flex-wrap items-center gap-2">
        {admin.status === "INVITED" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate(admin.id, {
                onSuccess: () => toast.success(t("admin.administrators.resent", admin)),
                onError: () => toast.error(t("admin.administrators.actionFailed")),
              })
            }
          >
            {t("admin.administrators.resend")}
          </Button>
        ) : null}
        {blockedBy ? (
          <span className="typo-small text-muted-foreground">{blockedBy}</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => {
              deactivate.reset()
              setToDeactivate(admin)
            }}
          >
            {admin.status === "INVITED"
              ? t("admin.administrators.cancelInvitation")
              : t("admin.administrators.deactivate")}
          </Button>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="typo-h1 text-foreground">{title}</h1>
        <Button
          className="h-11 md:h-9"
          onClick={() => {
            invite.reset()
            setIsInviting(true)
          }}
        >
          {t("admin.administrators.invite")}
        </Button>
      </div>
      <p className="typo-body text-muted-foreground">{t("admin.administrators.intro")}</p>

      {query.data ? (
        <AdminTable<Administrator>
          label={title}
          rows={query.data}
          rowKey={(admin) => admin.id}
          primary={{
            key: "name",
            header: t("admin.administrators.name"),
            cell: (admin) => admin.name,
          }}
          columns={[
            {
              key: "email",
              header: t("admin.administrators.email"),
              cell: (admin) => admin.email,
            },
            {
              key: "status",
              header: t("admin.administrators.status"),
              cell: (admin) => (
                <Badge variant={STATUS_BADGE[admin.status]}>
                  {t(`admin.administratorStatus.${admin.status}`)}
                </Badge>
              ),
            },
            {
              key: "createdBy",
              header: t("admin.administrators.createdBy"),
              cell: (admin) =>
                t("admin.administrators.byOn", {
                  name: admin.createdBy?.name ?? t("admin.administrators.fromServer"),
                  date: format.date(admin.createdAt),
                }),
            },
            {
              key: "deactivatedBy",
              header: t("admin.administrators.deactivatedBy"),
              cell: (admin) =>
                admin.deactivatedAt && admin.deactivatedBy
                  ? t("admin.administrators.byOn", {
                      name: admin.deactivatedBy.name,
                      date: format.date(admin.deactivatedAt),
                    })
                  : t("admin.none"),
            },
            {
              key: "actions",
              header: t("admin.administrators.actions"),
              cell: actionsOf,
            },
          ]}
        />
      ) : (
        <AdminState query={query} />
      )}

      <InviteAdministratorSheet
        isOpen={isInviting}
        onOpenChange={setIsInviting}
        isPending={invite.isPending}
        error={invite.error}
        onSubmit={async (values) => {
          const invited = await invite.mutateAsync(values)
          setIsInviting(false)
          toast.success(t("admin.administrators.invited", { email: invited.email }))
        }}
      />
      <DeactivateAdministratorSheet
        administrator={toDeactivate}
        isPending={deactivate.isPending}
        error={deactivate.error}
        onClose={() => setToDeactivate(null)}
        onConfirm={(admin) =>
          deactivate.mutate(admin.id, {
            onSuccess: () => {
              setToDeactivate(null)
              toast.success(t("admin.administrators.deactivated", admin))
            },
          })
        }
      />
    </div>
  )
}
