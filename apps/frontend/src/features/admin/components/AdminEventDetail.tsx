import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { AdminTable } from "@/components/hobbyhub/AdminTable"
import { Button } from "@/components/ui/button"

import { adminEventQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminEventDetail as Detail } from "@/features/admin/api/adminSchemas"
import { useHideEvent, useRestoreEvent } from "@/features/admin/api/eventModerationMutations"
import { EventBadges } from "@/features/admin/components/AdminEvents"
import { AdminFacts, AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminState } from "@/features/admin/components/AdminState"
import { HideEventSheet } from "@/features/admin/components/HideEventSheet"
import { RestoreEventSheet } from "@/features/admin/components/RestoreEventSheet"
import { useAdminFormat } from "@/features/admin/lib/format"

/**
 * #239: hide the event from everyone but its organizers, or bring it back.
 * A draft is seen by nobody, so it has nothing to hide.
 */
function EventModeration({ detail }: { detail: Detail }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const [sheet, setSheet] = useState<"hide" | "restore" | null>(null)
  const hide = useHideEvent(detail.event.id)
  const restore = useRestoreEvent(detail.event.id)
  if (detail.event.status === "DRAFT") return null

  const open = (next: "hide" | "restore") => {
    hide.reset()
    restore.reset()
    setSheet(next)
  }

  return (
    <AdminSection title={t("admin.moderation.title")}>
      {detail.isHidden ? (
        <AdminFacts
          facts={[
            { label: t("admin.moderation.reason"), value: detail.hiddenReason },
            {
              label: t("admin.moderation.hiddenAt"),
              value: detail.hiddenAt ? format.dateTime(detail.hiddenAt) : null,
            },
            { label: t("admin.moderation.hiddenBy"), value: detail.hiddenBy?.name ?? null },
          ]}
        />
      ) : (
        <p className="typo-body text-muted-foreground">{t("admin.moderation.visible")}</p>
      )}
      <div>
        <Button
          variant="outline"
          onClick={() => open(detail.isHidden ? "restore" : "hide")}
        >
          {detail.isHidden ? t("admin.moderation.restore") : t("admin.moderation.hide")}
        </Button>
      </div>
      <HideEventSheet
        isOpen={sheet === "hide"}
        onOpenChange={(isOpen) => setSheet(isOpen ? "hide" : null)}
        title={detail.event.title}
        isPending={hide.isPending}
        error={hide.error}
        onSubmit={async (values) => {
          await hide.mutateAsync(values)
          setSheet(null)
          toast.success(t("admin.moderation.hidden"))
        }}
      />
      <RestoreEventSheet
        isOpen={sheet === "restore"}
        onOpenChange={(isOpen) => setSheet(isOpen ? "restore" : null)}
        title={detail.event.title}
        isPending={restore.isPending}
        error={restore.error}
        onConfirm={() =>
          restore.mutate(undefined, {
            onSuccess: () => {
              setSheet(null)
              toast.success(t("admin.moderation.restored"))
            },
          })
        }
      />
    </AdminSection>
  )
}

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

      <EventModeration detail={query.data} />

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
