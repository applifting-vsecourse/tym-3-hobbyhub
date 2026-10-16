import { createFileRoute } from "@tanstack/react-router"

import deskovkyPhoto from "@/assets/event-photos/deskovky.jpg"
import florbalPhoto from "@/assets/event-photos/florbal.jpg"
import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { EventCard } from "@/components/hobbyhub/EventCard"
import { Hero } from "@/components/hobbyhub/Hero"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

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
    id: "deskovky",
    title: "Deskovky v herně",
    when: "Dnes 18:00",
    meta: "Herna Kostka · všechny úrovně",
    taken: 3,
    capacity: 5,
    photo: { src: deskovkyPhoto, alt: "Desková hra rozložená na stole" },
  },
  {
    id: "florbal",
    title: "Čtvrteční florbal",
    when: "Dnes 19:00",
    meta: "ZŠ Kobylisy · pokročilí",
    taken: 7,
    capacity: 10,
    photo: { src: florbalPhoto, alt: "Hráči florbalu v tělocvičně" },
  },
]

const STEPS = [
  "Vypište akci a řekněte, kolik lidí vám chybí do minima.",
  "Ostatní uvidí volná místa na mapě nebo v seznamu a požádají o účast.",
  "Schválíte účastníky a akce se uskuteční.",
]

function LandingPage() {
  return (
    <>
      <Seo title="Úvodní stránka" />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 md:py-8">
        <Hero
          titleAs="h1"
          kicker="Čtvrteční florbal · dnes 19:00"
          title="Doplňte chybějící hráče dřív, než se akce zruší"
          text="Chybí 3 do minima. Jedno z nich může být tvoje."
          taken={7}
          capacity={10}
          action={
            <Button asChild>
              <a href={ROUTES.events}>Obsadit místo</a>
            </Button>
          }
          secondaryAction={
            <Button
              asChild
              variant="secondary"
            >
              <a href={ROUTES.newEvent}>Vypsat akci</a>
            </Button>
          }
        />

        <section
          aria-labelledby="tonight-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="tonight-heading"
            className="typo-h3"
          >
            Dnes večer
          </h2>
          {TONIGHT.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {TONIGHT.map(({ id, ...event }) => (
                <EventCard
                  key={id}
                  {...event}
                />
              ))}
            </div>
          ) : (
            <p className="typo-body text-muted-foreground">
              Na dnešní večer zatím nic nemáme. Hledejte na další dny, nebo akci vypište sami — až
              se objeví, najdete je tady.
            </p>
          )}
        </section>

        <section
          aria-labelledby="how-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="how-heading"
            className="typo-h3"
          >
            Jak to funguje
          </h2>
          <ol className="flex flex-col gap-2 typo-body text-muted-foreground">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-3"
              >
                <span className="w-4 shrink-0 text-foreground">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row md:hidden">
            <Button
              asChild
              variant="secondary"
            >
              <a href={ROUTES.events}>Najít akci</a>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <a href={ROUTES.newEvent}>Vypsat akci</a>
            </Button>
          </div>
        </section>
      </main>
    </>
  )
}
