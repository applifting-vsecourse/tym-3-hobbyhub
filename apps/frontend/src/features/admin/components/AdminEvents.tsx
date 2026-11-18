import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { adminEventsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import {
  ADMIN_EVENT_FILTERS,
  type AdminEvent,
  type AdminEventFilter,
} from "@/features/admin/api/adminSchemas"
import { AdminFilterChips } from "@/features/admin/components/AdminFilterChips"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { AdminList } from "@/features/admin/components/AdminList"
import { useAdminFormat } from "@/features/admin/lib/format"

type ListProps = {
  search: string
  offset: number
  filter?: AdminEventFilter
  onChange: (next: { search: string; offset: number }) => void
  onFilterChange: (filter: AdminEventFilter | undefined) => void
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

export function AdminEvents({ search, offset, filter, onChange, onFilterChange }: ListProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminEventsQueryOptions(search, offset, filter))

  return (
    <AdminList<AdminEvent>
      title={t("admin.events.title")}
      searchLabel={t("admin.events.search")}
      search={search}
      offset={offset}
      onChange={onChange}
      query={query}
      empty={t("admin.events.empty")}
      isFiltered={filter !== undefined}
      filters={
        <AdminFilterChips<AdminEventFilter>
          label={t("admin.events.filter.label")}
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: undefined, label: t("admin.events.filter.all") },
            ...ADMIN_EVENT_FILTERS.map((value) => ({
              value,
              label: t(`admin.events.filter.${value}`),
            })),
          ]}
        />
      }
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
