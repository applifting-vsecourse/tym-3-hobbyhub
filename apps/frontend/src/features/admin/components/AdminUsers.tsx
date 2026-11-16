import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { adminUsersQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminUser } from "@/features/admin/api/adminSchemas"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminList } from "@/features/admin/components/AdminList"
import { useAdminFormat } from "@/features/admin/lib/format"

type ListProps = {
  search: string
  offset: number
  onChange: (next: { search: string; offset: number }) => void
}

/** Whether the account may be used; anything but ACTIVE stands out. */
export function UserStatusBadge({ status }: { status: AdminUser["status"] }) {
  const { t } = useTranslation()
  return (
    <Badge variant={status === "ACTIVE" ? "secondary" : "destructive"}>
      {t(`admin.userStatus.${status}`)}
    </Badge>
  )
}

export function AdminUsers({ search, offset, onChange }: ListProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminUsersQueryOptions(search, offset))

  return (
    <AdminList<AdminUser>
      title={t("admin.users.title")}
      searchLabel={t("admin.users.search")}
      search={search}
      offset={offset}
      onChange={onChange}
      query={query}
      empty={t("admin.users.empty")}
      rowKey={(user) => user.id}
      primary={{
        key: "name",
        header: t("admin.users.name"),
        cell: (user) => <AdminLink to={{ kind: "user", id: user.id }}>{user.name}</AdminLink>,
      }}
      columns={[
        { key: "email", header: t("admin.users.email"), cell: (user) => user.email },
        {
          key: "verified",
          header: t("admin.users.emailVerified"),
          cell: (user) => (user.emailVerified ? t("admin.yes") : t("admin.no")),
        },
        {
          key: "status",
          header: t("admin.users.status"),
          cell: (user) => <UserStatusBadge status={user.status} />,
        },
        {
          key: "createdAt",
          header: t("admin.users.createdAt"),
          cell: (user) => format.date(user.createdAt),
        },
      ]}
    />
  )
}
