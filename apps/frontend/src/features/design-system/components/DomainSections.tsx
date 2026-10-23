import { toast } from "sonner"

import deskovkyPhoto from "@/assets/event-photos/deskovky.jpg"
import florbalPhoto from "@/assets/event-photos/florbal.jpg"
import volejbalPhoto from "@/assets/event-photos/volejbal.jpg"
import vyletPhoto from "@/assets/event-photos/vylet.jpg"
import { BottomNav } from "@/components/hobbyhub/BottomNav"
import { ChatShare } from "@/components/hobbyhub/ChatShare"
import { EventCard } from "@/components/hobbyhub/EventCard"
import { EventDetailCard } from "@/components/hobbyhub/EventDetailCard"
import { EventPhoto } from "@/components/hobbyhub/EventPhoto"
import { Hero } from "@/components/hobbyhub/Hero"
import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"
import { Loader, type LoaderVariant } from "@/components/hobbyhub/Loader"
import { MapPin } from "@/components/hobbyhub/MapPin"
import { RosterRow } from "@/components/hobbyhub/RosterRow"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { Seat } from "@/components/hobbyhub/Seat"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { YourSeat } from "@/components/hobbyhub/YourSeat"
import { Button } from "@/components/ui/button"

import { ShareEventDemo } from "@/features/design-system/components/SheetDemos"
import { Example, ShowcaseSection } from "@/features/design-system/components/ShowcaseSection"

const CAPACITY_EXAMPLES = [
  { label: "7 z 10", taken: 7, min: 10 },
  { label: "5 z 5", taken: 5, min: 5 },
  { label: "4 z 6", taken: 4, min: 6 },
  { label: "8 z 12 (minimum 10)", taken: 8, min: 10, max: 12 },
]

const LOADER_VARIANTS: { variant: LoaderVariant; usage: string }[] = [
  { variant: "ball", usage: "Míč skáče · výpis akcí" },
  { variant: "volleyball", usage: "Volejbal · odesílání" },
  { variant: "dice", usage: "Kostka · výběr náhradníka" },
  { variant: "seats", usage: "Místa · soupiska a kapacita" },
  { variant: "bike", usage: "Kolo · mapa a okolí" },
  { variant: "player", usage: "Panáček · hledání hráčů" },
]

const notify = (message: string) => () => toast(message)

function BottomNavExample() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-background">
      <BottomNav
        active="discover"
        hasNewRequests
      />
    </div>
  )
}

export function DomainSections() {
  return (
    <>
      <ShowcaseSection
        id="mista"
        title="Místo a ukazatel míst"
        description="Kapacita jako místa u stolu místo procent: plný kruh obsazeno, čárkovaný chybí (počítá se do minima), prázdný volno nad minimem."
      >
        <Example
          label="Místo — obsazeno, chybí, volno"
          className="items-center"
        >
          <Seat state="taken" />
          <Seat state="missing" />
          <Seat state="free" />
        </Example>
        {CAPACITY_EXAMPLES.map(({ label, ...capacity }) => (
          <Example
            key={label}
            label={`Ukazatel míst ${label} — normální a malé`}
            className="items-center gap-8"
          >
            <SeatMeter {...capacity} />
            <SeatMeter
              size="sm"
              {...capacity}
            />
          </Example>
        ))}
      </ShowcaseSection>

      <ShowcaseSection
        id="soupiska"
        title="Soupiska míst"
        description="Každá akce je soupiska. Obsazená místa jsou avatary aktivit, místa chybějící do minima přerušované kruhy s plusem, volná místa nad minimem prázdné kroužky. Velikosti sm, md, lg a xl, světlý a tmavý povrch."
      >
        <Example label="Světlý povrch — sm, md, lg">
          <div className="flex flex-col gap-4">
            <RosterSeats
              size="sm"
              taken={7}
              capacity={10}
            />
            <RosterSeats
              size="md"
              taken={4}
              min={6}
              capacity={10}
            />
            <RosterSeats
              size="lg"
              taken={9}
              capacity={10}
            />
          </div>
        </Example>
        <Example label="Tmavý povrch (signal) — lg">
          <div className="rounded-xl bg-signal p-5">
            <RosterSeats
              size="lg"
              surface="dark"
              taken={2}
              min={3}
              capacity={10}
            />
          </div>
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="hrdinska-plocha"
        title="Hrdinská plocha"
        description="Tmavá plocha se soupiskou. Na mobilu pod sebou, od šířky md text vedle soupisky. Barva signal se používá jen tady, v pásu soupisky v e-mailu, na kartě Soupiska na desktopu a ve štítku „chybí N“."
      >
        <Hero
          kicker="Čtvrteční florbal · dnes 19:00"
          title="Doplňte chybějící hráče dřív, než se akce zruší"
          text="Chybí 3 do minima. Jedno z nich může být tvoje."
          taken={7}
          capacity={10}
          action={<Button onClick={notify("Místo obsazeno")}>Obsadit místo</Button>}
          secondaryAction={<Button variant="secondary">Vypsat akci</Button>}
        />
      </ShowcaseSection>

      <ShowcaseSection
        id="karty"
        title="Karta akce a řádek rozpisu"
        description="Karta akce má zaoblení xl, ostatní karty lg, bez gradientů a stínů. Ve výpisech se používá řádek rozpisu bez karty; detailní karta slouží pro detail a náhled z mapy."
      >
        <Example label="Karta akce (vzhled Soupiska)">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <EventCard
              title="Čtvrteční florbal"
              when="Dnes 19:00"
              meta="ZŠ Kobylisy · pokročilí"
              taken={7}
              min={8}
              max={10}
              photo={{ src: florbalPhoto, alt: "Hráči florbalu v tělocvičně" }}
            />
            <EventCard
              title="Deskovky v herně"
              when="Pá 18:30"
              meta="Herna Dobrá Kostka · začátečníci"
              taken={6}
              min={4}
              max={6}
              photo={{ src: deskovkyPhoto, alt: "Desková hra rozložená na stole" }}
            />
            <EventCard
              title="Šachy v kavárně (bez fotky)"
              when="Zítra 16:00"
              meta="Kavárna Šach, Brno-střed · pokročilí"
              taken={1}
              min={2}
              max={2}
              activity="sachy"
            />
          </div>
        </Example>
        <Example label="Řádek rozpisu">
          <div className="flex w-full max-w-md flex-col">
            <ScheduleRow
              time="19:00"
              title="Čtvrteční florbal"
              subtitle="Hala ZŠ Dolní, pokročilí"
              taken={7}
              min={10}
              photo={{ src: florbalPhoto, alt: "Hráči florbalu v tělocvičně" }}
            />
            <ScheduleRow
              time="20:30"
              title="Volejbal pod lampami (bez fotky)"
              subtitle="Stromovka, mírně pokročilí"
              taken={5}
              min={5}
              activity="volejbal"
            />
          </div>
        </Example>
        <Example label="Karta akce (detail) — chybí / naplněno">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <EventDetailCard
              activity="florbal"
              title="Čtvrteční florbal"
              day="Dnes"
              isToday
              time="19:00"
              endTime="20:30"
              place="Hala ZŠ Dolní"
              level="Pokročilí"
              taken={7}
              min={10}
              action={<Button onClick={notify("Žádost odeslána")}>Požádat o účast</Button>}
            />
            <EventDetailCard
              activity="florbal"
              title="Čtvrteční florbal"
              day="Pátek"
              time="19:00"
              endTime="20:30"
              place="Hala ZŠ Dolní"
              level="Pokročilí"
              taken={5}
              min={5}
              action={<Button variant="outline">Zapsat se jako náhradník</Button>}
            />
          </div>
        </Example>
        <Example label="Fotka akce — zaoblení md, lg, xl">
          <div className="grid w-full gap-4 sm:grid-cols-3">
            <EventPhoto
              src={volejbalPhoto}
              alt="Volejbal na hřišti"
              rounding="md"
            />
            <EventPhoto
              src={vyletPhoto}
              alt="Skupina na výletě v přírodě"
              rounding="lg"
            />
            <EventPhoto
              src={florbalPhoto}
              alt="Hráči florbalu v tělocvičně"
              rounding="xl"
            />
          </div>
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="radek-soupisky"
        title="Řádek soupisky, Tvoje místo a žádost o účast"
        description="Čárkuje se jen kruh místo avatara, ne celý řádek. Hlavní akce „Obsadit místo“ je uvnitř komponenty Tvoje místo, ne pod ní."
      >
        <Example label="Řádek soupisky — člověk, čeká, volné místo">
          <div className="flex w-full max-w-md flex-col gap-2">
            <RosterRow
              kind="person"
              avatar="florbalista"
              name="Tomáš_N"
              note="Organizátor"
            />
            <RosterRow
              kind="pending"
              avatar="hrac-her"
              name="Tomáš_N"
              note="Žádost odeslána"
            />
            <RosterRow
              kind="free"
              action={
                <ShareEventDemo
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      Sdílet do chatu
                    </Button>
                  }
                />
              }
            />
          </div>
        </Example>
        <Example label="Tvoje místo — světlý a tmavý povrch">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <YourSeat
              description="Organizátor žádost schválí ručně. Odhlásit se můžeš do čt 12:00."
              action={<Button>Obsadit místo</Button>}
            />
            <YourSeat
              surface="dark"
              description="Organizátor žádost schválí ručně. Odhlásit se můžeš do čt 12:00."
              action={<Button>Obsadit místo</Button>}
            />
          </div>
        </Example>
        <Example label="Žádost o účast">
          <JoinRequestCard
            className="max-w-sm"
            name="Honza_K"
            avatar="florbalista"
            hasVerifiedEmail
            activityLine="Florbal, pokročilí"
            historyLine="Registrován v březnu, 6 akcí"
            message="Hraju třetí rok za firemní tým. V Praze jsem nový a hledám pravidelnou čtvrteční skupinu."
            outcome="Po schválení bude 8/10, chybět budou 2."
            onApprove={notify("Žádost schválena")}
            onReject={notify("Žádost zamítnuta")}
          />
        </Example>
        <Example label="Zpráva do chatu (Sdílení do chatu)">
          <ChatShare
            className="max-w-sm"
            message="Čtvrtek florbal, chybí 2. Potvrď, jestli jdeš:"
            url="https://hobbyhub.cz/akce/ctvrtecni-florbal"
          />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="mapa"
        title="Pin na mapě"
        description="Číslo je počet chybějících lidí. Naplněná akce má fajfku, shluk spojuje blízké akce, vybraný pin je kruh bez špičky s plným prstencem."
      >
        <Example
          label="Chybí, naplněno, shluk, vybraný"
          className="items-end gap-6"
        >
          <MapPin
            variant="missing"
            count={3}
          />
          <MapPin variant="filled" />
          <MapPin
            variant="cluster"
            count={5}
          />
          <MapPin
            variant="selected"
            count={1}
          />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="navigace"
        title="Spodní navigace"
        description="Dolní lišta má vystouplé tlačítko s logem „Přidat“. Přihlášky a Pořádám jsou sloučené do Moje akce; tečka značí nové žádosti."
      >
        <BottomNavExample />
      </ShowcaseSection>

      <ShowcaseSection
        id="loadery"
        title="Loadery"
        description="Šest animovaných loaderů se sportovními a hobby motivy. Loader se ukáže až po 300 ms čekání, je vždy jen jeden, má textový popis a při omezeném pohybu se nehýbe. Tady jsou zobrazené všechny najednou jen pro ukázku."
      >
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {LOADER_VARIANTS.map(({ variant, usage }) => (
            <li
              key={variant}
              className="flex flex-col items-center gap-2"
            >
              <Loader
                variant={variant}
                isImmediate
              />
              <span className="typo-caption text-muted-foreground">{usage}</span>
            </li>
          ))}
        </ul>
      </ShowcaseSection>
    </>
  )
}
