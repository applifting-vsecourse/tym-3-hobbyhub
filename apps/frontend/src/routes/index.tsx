import type { CSSProperties } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import deskovkyPhoto from "@/assets/event-photos/deskovky.jpg"
import florbalPhoto from "@/assets/event-photos/florbal.jpg"
import volejbalPhoto from "@/assets/event-photos/volejbal.jpg"
import { EventCard } from "@/components/hobbyhub/EventCard"
import { Hero } from "@/components/hobbyhub/Hero"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { AppShell } from "@/features/auth/components/AppShell"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

type TonightEvent = {
  id: string
  title: string
  when: string
  meta: string
  taken: number
  capacity: number
  photo: { src: string; alt: string }
}

// Static preview until the events API exists. Swap for a query then; the
// empty state below already handles an empty list.
const TONIGHT: TonightEvent[] = [
  {
    id: "florbal",
    title: "Čtvrteční florbal",
    when: "Dnes 19:00",
    meta: "ZŠ Kobylisy · pokročilí",
    taken: 7,
    capacity: 10,
    photo: { src: florbalPhoto, alt: "Hráči florbalu v tělocvičně" },
  },
  {
    id: "deskovky",
    title: "Deskovky v herně",
    when: "Dnes 18:00",
    meta: "Herna Kostka · všechny úrovně",
    taken: 3,
    capacity: 5,
    photo: { src: deskovkyPhoto, alt: "Desková hra rozložená na stole" },
  },
  {
    id: "volejbal",
    title: "Volejbal na hřišti",
    when: "Zítra 10:00",
    meta: "Hřiště Letná · začátečníci",
    taken: 4,
    capacity: 6,
    photo: { src: volejbalPhoto, alt: "Volejbal na pláži ve městě" },
  },
]

const STEP_KEYS = ["step1", "step2", "step3"] as const

function LandingPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("landing.seoTitle")} />
      <AppShell
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:gap-12 md:px-6 md:py-10 lg:px-8"
        search={
          <SearchField
            label={t("landing.search.label")}
            placeholder={t("landing.search.placeholder")}
          />
        }
      >
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
              <a href={ROUTES.events}>{t("landing.hero.join")}</a>
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
          aria-labelledby="tonight-heading"
          className="flex enter flex-col gap-3"
          style={{ "--enter-index": 1 } as CSSProperties}
        >
          <h2
            id="tonight-heading"
            className="typo-h3"
          >
            {t("landing.tonight.title")}
          </h2>
          {TONIGHT.length > 0 ? (
            <div className="grid gap-4 [--seat-delay:900ms] md:grid-cols-2 lg:grid-cols-3">
              {TONIGHT.map(({ id, ...event }) => (
                <a
                  key={id}
                  href={ROUTES.events}
                  className="group block rounded-xl transition-transform duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
                >
                  <EventCard
                    isAnimated
                    className="h-full transition-colors duration-200 group-hover:border-primary group-focus-visible:border-primary"
                    {...event}
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="typo-body text-muted-foreground">{t("landing.tonight.empty")}</p>
          )}
        </section>

        <section
          aria-labelledby="how-heading"
          className="flex enter flex-col gap-3"
          style={{ "--enter-index": 2 } as CSSProperties}
        >
          <h2
            id="how-heading"
            className="typo-h3"
          >
            {t("landing.how.title")}
          </h2>
          <ol className="flex flex-col gap-2 typo-body text-muted-foreground lg:grid lg:grid-cols-3 lg:gap-8">
            {STEP_KEYS.map((key, index) => (
              <li
                key={key}
                className="flex gap-3"
              >
                <span className="w-4 shrink-0 text-foreground">{index + 1}.</span>
                {t(`landing.how.${key}`)}
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              asChild
              variant="secondary"
            >
              <a href={ROUTES.events}>{t("landing.actions.find")}</a>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link to={ROUTES.newEvent}>{t("landing.actions.create")}</Link>
            </Button>
          </div>
        </section>
      </AppShell>
    </>
  )
}
