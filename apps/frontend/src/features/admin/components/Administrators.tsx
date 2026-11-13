import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { AdminTable } from "@/components/hobbyhub/AdminTable"

import { administratorsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import { AdminState } from "@/features/admin/components/AdminState"
import { useAdminFormat } from "@/features/admin/lib/format"

/** Who runs the platform. New ones come from `admin:create`, not from here. */
export function Administrators() {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(administratorsQueryOptions())
  const title = t("admin.administrators.title")

  return (
    <div className="flex flex-col gap-6">
      <h1 className="typo-h1 text-foreground">{title}</h1>
      <p className="typo-body text-muted-foreground">{t("admin.administrators.howToAdd")}</p>
      {query.data ? (
        <AdminTable
          label={title}
          rows={query.data}
          rowKey={(administrator) => administrator.id}
          primary={{
            key: "name",
            header: t("admin.administrators.name"),
            cell: (administrator) => administrator.name,
          }}
          columns={[
            {
              key: "email",
              header: t("admin.administrators.email"),
              cell: (administrator) => administrator.email,
            },
            {
              key: "createdAt",
              header: t("admin.administrators.createdAt"),
              cell: (administrator) => format.date(administrator.createdAt),
            },
          ]}
        />
      ) : (
        <AdminState query={query} />
      )}
    </div>
  )
}
