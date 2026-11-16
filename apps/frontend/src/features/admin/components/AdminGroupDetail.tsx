import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { AdminTable } from "@/components/hobbyhub/AdminTable"

import {
  adminGroupQueryOptions,
  adminGroupRequestsQueryOptions,
} from "@/features/admin/api/adminQueryOptions"
import type {
  AdminGroupRequest,
  AdminGroupDetail as Detail,
} from "@/features/admin/api/adminSchemas"
import { AdminFacts, AdminSection } from "@/features/admin/components/AdminFacts"
import { GroupBadges } from "@/features/admin/components/AdminGroups"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminState } from "@/features/admin/components/AdminState"
import { useAdminFormat } from "@/features/admin/lib/format"

/** #238: a group with everyone in it, private ones too (visibility matrix: Superadmin). */
export function AdminGroupDetail({ groupId }: { groupId: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminGroupQueryOptions(groupId))
  if (!query.data) return <AdminState query={query} />

  const { group, members } = query.data

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="typo-h1 text-foreground">{group.name}</h1>
        <GroupBadges group={group} />
      </div>

      <AdminSection title={t("admin.group.basics")}>
        <AdminFacts
          facts={[
            { label: t("admin.groups.activity"), value: group.activity.name },
            { label: t("admin.group.location"), value: group.locationName },
            { label: t("admin.group.schedule"), value: group.usualSchedule },
            { label: t("admin.groups.createdAt"), value: format.dateTime(group.createdAt) },
          ]}
        />
        <p className="typo-body whitespace-pre-line text-foreground">{group.description}</p>
      </AdminSection>

      <AdminSection title={t("admin.group.members", { count: members.length })}>
        <AdminTable<Detail["members"][number]>
          label={t("admin.group.members", { count: members.length })}
          rows={members}
          rowKey={(member) => member.userId}
          primary={{
            key: "name",
            header: t("admin.users.name"),
            cell: (member) => (
              <AdminLink to={{ kind: "user", id: member.userId }}>{member.name}</AdminLink>
            ),
          }}
          columns={[
            {
              key: "role",
              header: t("admin.group.role"),
              cell: (member) => t(`admin.groupRole.${member.role}`),
            },
            {
              key: "joinedAt",
              header: t("admin.group.joinedAt"),
              cell: (member) => format.date(member.joinedAt),
            },
          ]}
        />
      </AdminSection>

      <PendingRequests groupId={groupId} />
    </div>
  )
}

function PendingRequests({ groupId }: { groupId: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminGroupRequestsQueryOptions(groupId))
  const title = t("admin.group.requests")

  return (
    <AdminSection title={title}>
      {!query.data ? (
        <AdminState query={query} />
      ) : query.data.length === 0 ? (
        <p className="typo-body text-muted-foreground">{t("admin.group.noRequests")}</p>
      ) : (
        <AdminTable<AdminGroupRequest>
          label={title}
          rows={query.data}
          rowKey={(request) => request.id}
          primary={{
            key: "name",
            header: t("admin.users.name"),
            cell: (request) => request.applicant.name,
          }}
          columns={[
            {
              key: "message",
              header: t("admin.group.message"),
              cell: (request) => request.message ?? t("admin.none"),
            },
            {
              key: "requestedAt",
              header: t("admin.group.requestedAt"),
              cell: (request) => format.dateTime(request.requestedAt),
            },
          ]}
        />
      )}
    </AdminSection>
  )
}
