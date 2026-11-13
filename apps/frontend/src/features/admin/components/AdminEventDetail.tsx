import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { AdminTable } from "@/components/hobbyhub/AdminTable"

import { adminEventQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminEventDetail as Detail } from "@/features/admin/api/adminSchemas"
import { EventBadges } from "@/features/admin/components/AdminEvents"
import { AdminFacts, AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminState } from "@/features/admin/components/AdminState"
import { useAdminFormat } from "@/features/admin/lib/format"

/** #238: the whole event, hidden and drafts too (visibility matrix: Superadmin). */
export function AdminEventDetail({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminEventQueryOptions(eventId))
  if (!query.data) return <AdminState query={query} />

  const { event, isHidden, organizer, group, participants } = query.data
  const location = event.location

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="typo-h1 text-foreground">{event.title}</h1>
        <EventBadges event={{ status: event.status, visibility: event.visibility, isHidden }} />
      </div>

      <AdminSection title={t("admin.event.basics")}>
        <AdminFacts
          facts={[
            { label: t("admin.events.activity"), value: event.activity.name },
            {
              label: t("admin.events.startAt"),
              value: `${format.dateTime(event.startAt)} – ${format.dateTime(event.endAt)}`,
            },
            {
              label: t("admin.events.organizer"),
              value: (
                <>
                  <AdminLink to={{ kind: "user", id: organizer.id }}>{organizer.name}</AdminLink>
                  {` (${organizer.email})`}
                </>
              ),
            },
            {
              label: t("admin.event.group"),
              value: group ? (
                <AdminLink to={{ kind: "group", id: group.id }}>{group.name}</AdminLink>
              ) : null,
            },
            {
              label: t("admin.event.capacity"),
              value: t("admin.event.capacityValue", {
                approved: event.approvedCount,
                min: event.minParticipants,
                max: event.maxParticipants,
              }),
            },
            {
              label: t("admin.event.address"),
              value: location
                ? [
                    location.placeName,
                    `${location.street}, ${location.postalCode} ${location.city}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null,
            },
            { label: t("admin.event.contact"), value: event.contact },
            { label: t("admin.event.externalChat"), value: event.externalChatUrl },
            {
              label: t("admin.event.cancellation"),
              value: event.cancellationReason
                ? [event.cancellationReason, event.cancellationNote].filter(Boolean).join(" – ")
                : null,
            },
          ]}
        />
      </AdminSection>

      <AdminSection title={t("admin.event.description")}>
        <p className="typo-body whitespace-pre-line text-foreground">{event.description}</p>
      </AdminSection>

      <AdminSection title={t("admin.event.participants")}>
        {participants.length === 0 ? (
          <p className="typo-body text-muted-foreground">{t("admin.event.noParticipants")}</p>
        ) : (
          <AdminTable<Detail["participants"][number]>
            label={t("admin.event.participants")}
            rows={participants}
            rowKey={(participant) => participant.userId}
            primary={{
              key: "name",
              header: t("admin.users.name"),
              cell: (participant) => (
                <AdminLink to={{ kind: "user", id: participant.userId }}>
                  {participant.name}
                </AdminLink>
              ),
            }}
            columns={[
              {
                key: "status",
                header: t("admin.users.status"),
                cell: (participant) =>
                  participant.waitlistPosition === null
                    ? t(`admin.participationStatus.${participant.status}`)
                    : t("admin.event.waitlistPosition", {
                        status: t(`admin.participationStatus.${participant.status}`),
                        position: participant.waitlistPosition,
                      }),
              },
            ]}
          />
        )}
      </AdminSection>
    </div>
  )
}
