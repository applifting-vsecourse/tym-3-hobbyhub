import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { AppShell } from "@/app/AppShell"
import { Footer } from "@/components/Footer"
import { AppForm } from "@/components/form/AppForm"
import { EMPTY_FILTERS, FiltersSheet } from "@/components/hobbyhub/FiltersSheet"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { AccountLanguageChoice } from "@/features/auth/components/AccountLanguageChoice"
import { useSession } from "@/features/auth/hooks/useSession"
import { EVENT_SEARCH_MAX_LENGTH, nonEmpty } from "@/features/event/lib/eventsSearch"
import {
  freeEventsCountQueryOptions,
  landingQueryOptions,
} from "@/features/landing/api/landingQueryOptions"
import { LandingHero } from "@/features/landing/components/LandingHero"
import { LandingRows } from "@/features/landing/components/LandingRows"
import { readLandingCity, saveLandingCity } from "@/features/landing/lib/landingCity"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isPending: isSessionPending } = useSession()
  const searchForm = useForm({ defaultValues: { q: "" } })
  const searchText = useWatch({ control: searchForm.control, name: "q" })
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  // #215: the visitor's city for "Ve tvém okolí", remembered in this browser.
  const [city, setCity] = useState(readLandingCity)
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
  // The rows depend on who asks: wait for the session, so a signed-in person
  // never first sees the visitor's rows.
  const landingQuery = useQuery({
    ...landingQueryOptions(user?.id ?? null, city),
    enabled: !isSessionPending,
  })
  const freeCountQuery = useQuery(freeEventsCountQueryOptions())

  const changeCity = (next: string) => {
    setCity(next)
    saveLandingCity(next)
  }

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
  // The same field twice: in the header from `lg`, above the hero below it.
  // Both share one form, so what is typed in one shows in the other.
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
      <Seo
        title={t("landing.seoTitle")}
        description={t("landing.seoDescription")}
      />
      <AppShell
        className="mx-auto flex w-full max-w-page flex-col gap-12 px-page py-6 md:gap-16 md:py-10"
        search={searchField}
        footer={<Footer language={<AccountLanguageChoice />} />}
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
        <div className="-mb-6 lg:hidden">{searchField}</div>
        <LandingHero freeEventCount={freeCountQuery.data} />
        <LandingRows
          landing={landingQuery.data}
          isLoading={isSessionPending || landingQuery.isPending}
          error={landingQuery.error}
          onRetry={() => void landingQuery.refetch()}
          isSignedIn={Boolean(user)}
          onCityChange={changeCity}
          activityLabel={(activity) => activityName(t, activity)}
        />
      </AppShell>
    </>
  )
}
