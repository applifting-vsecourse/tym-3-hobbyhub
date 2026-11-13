import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { adminGroupsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminGroup } from "@/features/admin/api/adminSchemas"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminList } from "@/features/admin/components/AdminList"
import { useAdminFormat } from "@/features/admin/lib/format"

type ListProps = {
  search: string
  offset: number
  onChange: (next: { search: string; offset: number }) => void
}

export function GroupBadges({ group }: { group: Pick<AdminGroup, "status" | "visibility"> }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={group.status === "ACTIVE" ? "success" : "secondary"}>
        {t(`admin.groupStatus.${group.status}`)}
      </Badge>
      {group.visibility === "PRIVATE" ? (
        <Badge variant="outline">{t("admin.groups.private")}</Badge>
      ) : null}
    </span>
  )
}

export function AdminGroups({ search, offset, onChange }: ListProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminGroupsQueryOptions(search, offset))

  return (
    <AdminList<AdminGroup>
      title={t("admin.groups.title")}
      searchLabel={t("admin.groups.search")}
      search={search}
      offset={offset}
      onChange={onChange}
      query={query}
      empty={t("admin.groups.empty")}
      rowKey={(group) => group.id}
      primary={{
        key: "name",
        header: t("admin.groups.name"),
        cell: (group) => <AdminLink to={{ kind: "group", id: group.id }}>{group.name}</AdminLink>,
      }}
      columns={[
        {
          key: "state",
          header: t("admin.groups.state"),
          cell: (group) => <GroupBadges group={group} />,
        },
        {
          key: "activity",
          header: t("admin.groups.activity"),
          cell: (group) => group.activity.name,
        },
        {
          key: "members",
          header: t("admin.groups.memberCount"),
          cell: (group) => group.memberCount,
        },
        {
          key: "createdAt",
          header: t("admin.groups.createdAt"),
          cell: (group) => format.date(group.createdAt),
        },
      ]}
    />
  )
}
