import { useMemo, useState, type CSSProperties } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import { Footer } from "@/components/Footer"
import { AppForm } from "@/components/form/AppForm"
import { EMPTY_FILTERS, FiltersSheet } from "@/components/hobbyhub/FiltersSheet"
import { Hero } from "@/components/hobbyhub/Hero"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { upcomingEventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { UpcomingEvents } from "@/features/event/components/UpcomingEvents"
import { EVENT_SEARCH_MAX_LENGTH, nonEmpty } from "@/features/event/lib/eventsSearch"
import { HowItWorks } from "@/features/landing/components/HowItWorks"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

// Three cards: one row from `lg`, where the landing page is at its widest.
const UPCOMING_EVENTS_COUNT = 3

function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchForm = useForm({ defaultValues: { q: "" } })
  const searchText = useWatch({ control: searchForm.control, name: "q" })
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((item) => ({
        id: item.id,
        label: activityName(t, item),
        icon: item.icon,
        category: item.category,
      })),
    [activitiesQuery.data, t],
  )
  const upcomingQuery = useQuery(upcomingEventsQueryOptions(UPCOMING_EVENTS_COUNT))

  // Searching or filtering from the landing page opens the event list already filtered.
  const openEvents = (filters: { activities?: string[]; location?: string } = {}) => {
    void navigate({
      to: "/events",
      search: {
        q: nonEmpty(searchForm.getValues("q")),
        activity: filters.activities?.length ? filters.activities : undefined,
        location: nonEmpty(filters.location),
      },
    })
  }
  // The same field twice: in the header from `lg`, in the page below it. Both
  // share one form, so what is typed in one shows in the other.
  const searchField = (
    <AppForm
      form={searchForm}
      isGuarded={false}
      role="search"
      className="contents"
      onSubmit={() => openEvents()}
    >
      <SearchField
        label={t("landing.search.label")}
        placeholder={t("landing.search.placeholder")}
        maxLength={EVENT_SEARCH_MAX_LENGTH}
        value={searchText}
        onChange={(event) => searchForm.setValue("q", event.target.value)}
        onOpenFilters={() => setIsFiltersOpen(true)}
      />
    </AppForm>
  )

  return (
    <>
      <Seo title={t("landing.seoTitle")} />
      <AppShell
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:gap-12 md:px-6 md:py-10 lg:px-8"
        search={searchField}
        footer={<Footer />}
      >
        <FiltersSheet
          isOpen={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          value={EMPTY_FILTERS}
          onApply={openEvents}
          fields={["activity", "location"]}
          activitiesState={{
            isLoading: activitiesQuery.isPending,
            error: activitiesQuery.error,
            onRetry: () => void activitiesQuery.refetch(),
          }}
          activityOptions={activityOptions}
        />
        <div className="lg:hidden">{searchField}</div>
        <Hero
          className="enter [--seat-delay:400ms]"
          isAnimated
          titleAs="h1"
          kicker={t("landing.hero.kicker")}
          title={t("landing.hero.title")}
          text={t("landing.hero.text")}
          taken={7}
          capacity={10}
          action={
            <Button asChild>
              <Link to={ROUTES.events}>{t("landing.hero.join")}</Link>
            </Button>
          }
          secondaryAction={
            <Button
              asChild
              variant="secondary"
            >
              <Link to={ROUTES.newEvent}>{t("landing.actions.create")}</Link>
            </Button>
          }
        />

        <section
          aria-labelledby="upcoming-heading"
          className="flex enter flex-col gap-3"
          style={{ "--enter-index": 1 } as CSSProperties}
        >
          <h2
            id="upcoming-heading"
            className="typo-h3"
          >
            {t("landing.upcoming.title")}
          </h2>
          <UpcomingEvents
            events={upcomingQuery.data?.items ?? []}
            activityLabel={(item) => activityName(t, item)}
            isLoading={upcomingQuery.isPending}
            error={upcomingQuery.error}
            onReload={() => void upcomingQuery.refetch()}
          />
        </section>

        <HowItWorks
          className="enter"
          style={{ "--enter-index": 2 } as CSSProperties}
        />

        {/* Groups (#151): the invitation. The same dashed accent surface as
            "Tvoje místo" on an event, with the crew and one free seat: what a
            group is for, and one way in. No cards of particular groups: the
            list is a click away, and a visitor cannot tell a good pick from a
            random one. */}
        <section
          aria-labelledby="groups-heading"
          className="flex enter flex-col gap-3"
          style={{ "--enter-index": 3 } as CSSProperties}
        >
          <h2
            id="groups-heading"
            className="typo-h3"
          >
            {t("landing.groups.title")}
          </h2>
          <div className="flex flex-col gap-6 rounded-xl border border-dashed border-primary bg-accent p-5 text-accent-foreground md:flex-row md:items-center md:gap-12 md:px-12 md:py-10">
            <div
              aria-hidden
              className="shrink-0"
            >
              <RosterSeats
                size="lg"
                taken={4}
                capacity={5}
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="typo-title">{t("landing.groups.seatTitle")}</p>
              <p className="max-w-xl typo-body">{t("landing.groups.text")}</p>
              <div className="pt-2 *:max-md:w-full">
                <Button asChild>
                  <Link to={ROUTES.groups}>{t("landing.groups.browse")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </AppShell>
    </>
  )
}
