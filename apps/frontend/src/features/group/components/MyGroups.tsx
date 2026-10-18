import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Trans, useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"

import {
  myGroupsQueryOptions,
  nearbyGroupsQueryOptions,
} from "@/features/group/api/groupListQueryOptions"
import { GroupCard, type ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupGrid } from "@/features/group/components/GroupGrid"

const linkClassName = "text-primary underline-offset-4 hover:underline"

/** "Moje skupiny" tab: the viewer's groups, then a few public ones nearby. */
export function MyGroups({ activityLabel }: { activityLabel: ActivityLabel }) {
  const { t } = useTranslation()
  const mine = useQuery(myGroupsQueryOptions())
  const nearby = useQuery(nearbyGroupsQueryOptions())
  const hasCity = Boolean(nearby.data?.city)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="my-groups-heading">
        <h2
          id="my-groups-heading"
          className="sr-only"
        >
          {t("groups.list.tabs.mine")}
        </h2>
        <GroupGrid
          items={mine.data}
          isPending={mine.isPending}
          error={mine.error}
          onRetry={() => void mine.refetch()}
          getKey={(group) => group.id}
          renderItem={(group) => (
            <GroupCard
              group={group}
              activityLabel={activityLabel}
              myRole={group.myRole}
            />
          )}
          empty={
            <Trans
              i18nKey="groups.list.mineEmpty"
              components={{
                discover: (
                  <Link
                    to="/groups"
                    search={{ tab: "discover" }}
                    className={linkClassName}
                  />
                ),
              }}
            />
          }
        />
      </section>

      <section
        aria-labelledby="nearby-groups-heading"
        className="flex flex-col gap-4"
      >
        <h2
          id="nearby-groups-heading"
          className="typo-h3 text-foreground"
        >
          {t("groups.list.nearbyTitle")}
        </h2>
        <GroupGrid
          items={nearby.data?.groups}
          isPending={nearby.isPending}
          error={nearby.error}
          onRetry={() => void nearby.refetch()}
          getKey={(group) => group.id}
          renderItem={(group) => (
            <GroupCard
              group={group}
              activityLabel={activityLabel}
            />
          )}
          empty={
            hasCity ? (
              t("groups.list.nearbyEmpty")
            ) : (
              <Trans
                i18nKey="groups.list.nearbyNoCity"
                components={{
                  // The profile page does not exist yet; a plain link until it does.
                  profile: (
                    // eslint-disable-next-line jsx-a11y/anchor-has-content -- Trans fills it
                    <a
                      href={ROUTES.profile}
                      className={linkClassName}
                    />
                  ),
                }}
              />
            )
          }
        />
      </section>
    </div>
  )
}
