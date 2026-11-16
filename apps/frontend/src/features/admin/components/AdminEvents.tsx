import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { adminEventsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { AdminEvent } from "@/features/admin/api/adminSchemas"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminList } from "@/features/admin/components/AdminList"
import { useAdminFormat } from "@/features/admin/lib/format"

type ListProps = {
  search: string
  offset: number
  onChange: (next: { search: string; offset: number }) => void
}

/** The status, and the marks that only the administration sees. */
export function EventBadges({
  event,
}: {
  event: Pick<AdminEvent, "status" | "visibility" | "isHidden">
}) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={event.status === "PUBLISHED" ? "success" : "secondary"}>
        {t(`admin.eventStatus.${event.status}`)}
      </Badge>
      {event.isHidden ? <Badge variant="destructive">{t("admin.events.hidden")}</Badge> : null}
      {event.visibility === "PUBLIC" ? null : (
        <Badge variant="outline">{t(`admin.eventVisibility.${event.visibility}`)}</Badge>
      )}
    </span>
  )
}

export function AdminEvents({ search, offset, onChange }: ListProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminEventsQueryOptions(search, offset))

  return (
    <AdminList<AdminEvent>
      title={t("admin.events.title")}
      searchLabel={t("admin.events.search")}
      search={search}
      offset={offset}
      onChange={onChange}
      query={query}
      empty={t("admin.events.empty")}
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
          cell: (event) => <EventBadges event={event} />,
        },
        {
          key: "startAt",
          header: t("admin.events.startAt"),
          cell: (event) => format.dateTime(event.startAt),
        },
        {
          key: "activity",
          header: t("admin.events.activity"),
          cell: (event) => event.activityName,
        },
        {
          key: "organizer",
          header: t("admin.events.organizer"),
          cell: (event) => (
            <AdminLink to={{ kind: "user", id: event.organizer.id }}>
              {event.organizer.name}
            </AdminLink>
          ),
        },
      ]}
    />
  )
}
