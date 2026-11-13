import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { AdminTable } from "@/components/hobbyhub/AdminTable"
import { Badge } from "@/components/ui/badge"

import {
  adminUserEventsQueryOptions,
  adminUserQueryOptions,
} from "@/features/admin/api/adminQueryOptions"
import type { AdminEvent, AdminUserEvents } from "@/features/admin/api/adminSchemas"
import { EventBadges } from "@/features/admin/components/AdminEvents"
import { AdminFacts, AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminState } from "@/features/admin/components/AdminState"
import { UserStatusBadge } from "@/features/admin/components/AdminUsers"
import { useAdminFormat } from "@/features/admin/lib/format"

/** #238: an account with its whole profile (visibility matrix: Superadmin). */
export function AdminUserDetail({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminUserQueryOptions(userId))
  if (!query.data) return <AdminState query={query} />

  const { account, profile } = query.data
  const address = profile.address

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="typo-h1 text-foreground">{account.name}</h1>
        <UserStatusBadge status={account.status} />
      </div>

      <AdminSection title={t("admin.user.account")}>
        <AdminFacts
          facts={[
            { label: t("admin.users.email"), value: account.email },
            {
              label: t("admin.users.emailVerified"),
              value: account.emailVerified ? t("admin.yes") : t("admin.no"),
            },
            { label: t("admin.users.createdAt"), value: format.dateTime(account.createdAt) },
          ]}
        />
      </AdminSection>

      <AdminSection title={t("admin.user.profile")}>
        <AdminFacts
          facts={[
            { label: t("admin.user.bio"), value: profile.bio },
            {
              label: t("admin.user.gender"),
              value: profile.gender ? t(`admin.gender.${profile.gender}`) : null,
            },
            { label: t("admin.user.birthYear"), value: profile.birthYear },
            {
              label: t("admin.user.address"),
              value: address
                ? `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`
                : null,
            },
            {
              label: t("admin.user.interests"),
              value:
                profile.interests.length > 0
                  ? profile.interests
                      .map(({ activity, level }) =>
                        level ? `${activity.name} (${level.name})` : activity.name,
                      )
                      .join(", ")
                  : null,
            },
          ]}
        />
      </AdminSection>

      <UserEvents userId={userId} />
    </div>
  )
}

function UserEvents({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const query = useQuery(adminUserEventsQueryOptions(userId))

  return (
    <>
      <AdminSection title={t("admin.user.organized")}>
        {query.data ? (
          <EventRows
            label={t("admin.user.organized")}
            rows={query.data.organized}
            empty={t("admin.user.noOrganized")}
          />
        ) : (
          <AdminState query={query} />
        )}
      </AdminSection>
      <AdminSection title={t("admin.user.participations")}>
        {query.data ? (
          <EventRows
            label={t("admin.user.participations")}
            rows={query.data.participations}
            empty={t("admin.user.noParticipations")}
          />
        ) : (
          <AdminState query={query} />
        )}
      </AdminSection>
    </>
  )
}

type EventRow = AdminEvent & {
  participationStatus?: AdminUserEvents["participations"][number]["participationStatus"]
}

function EventRows({ label, rows, empty }: { label: string; rows: EventRow[]; empty: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  if (rows.length === 0) return <p className="typo-body text-muted-foreground">{empty}</p>

  return (
    <AdminTable<EventRow>
      label={label}
      rows={rows}
      rowKey={(event) => event.id}
      primary={{
        key: "title",
        header: t("admin.events.name"),
        cell: (event) => <AdminLink to={{ kind: "event", id: event.id }}>{event.title}</AdminLink>,
      }}
      columns={[
        {
          key: "state",
          header: t("admin.events.state"),
          cell: (event) => (
            <span className="inline-flex flex-wrap gap-1">
              <EventBadges event={event} />
              {event.participationStatus ? (
                <Badge variant="outline">
                  {t(`admin.participationStatus.${event.participationStatus}`)}
                </Badge>
              ) : null}
            </span>
          ),
        },
        {
          key: "startAt",
          header: t("admin.events.startAt"),
          cell: (event) => format.dateTime(event.startAt),
        },
      ]}
    />
  )
}
