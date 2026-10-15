import { useEffect, useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { toast } from "sonner"

import { Counter } from "@/components/hobbyhub/Counter"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { PhotoPicker } from "@/components/hobbyhub/PhotoPicker"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

import { SearchWithFilters } from "@/features/design-system/components/SheetDemos"
import { Example, ShowcaseSection } from "@/features/design-system/components/ShowcaseSection"

const BUTTON_TYPES = [
  { variant: "default", label: "Primární" },
  { variant: "secondary", label: "Sekundární" },
  { variant: "outline", label: "Obrys" },
  { variant: "ghost", label: "Duch" },
  { variant: "destructive", label: "Destruktivní" },
] as const

const FILTERS = ["Chybí lidé", "Vítáni nováčci", "Tento týden"]

function FilterExample() {
  const [active, setActive] = useState<string[]>(["Chybí lidé"])

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <FilterChip
          key={filter}
          pressed={active.includes(filter)}
          onPressedChange={(isPressed) =>
            setActive((current) =>
              isPressed ? [...current, filter] : current.filter((item) => item !== filter),
            )
          }
        >
          {filter}
        </FilterChip>
      ))}
    </div>
  )
}

function PhotoPickerExample() {
  const [photo, setPhoto] = useState<string>()

  // Release the object URL when it is replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  return (
    <PhotoPicker
      value={photo}
      onFileSelect={(file) => setPhoto(URL.createObjectURL(file))}
    />
  )
}

export function ControlSections() {
  const [view, setView] = useState<EventsView>("map")
  const [minimum, setMinimum] = useState(8)

  return (
    <>
      <ShowcaseSection
        id="tlacitka"
        title="Tlačítko"
        description="Hlavní akce je vždy jedna na obrazovku (Primární). Destruktivní jen pro nevratné akce a nikdy vedle plného Primárního. Velikost M (44 px) je výchozí, S (36 px) je size sm."
      >
        <Example label="Velikost M">
          {BUTTON_TYPES.map(({ variant, label }) => (
            <Button
              key={variant}
              variant={variant}
            >
              {label}
            </Button>
          ))}
        </Example>
        <Example label="Velikost S">
          {BUTTON_TYPES.map(({ variant, label }) => (
            <Button
              key={variant}
              variant={variant}
              size="sm"
            >
              {label}
            </Button>
          ))}
        </Example>
        <Example label="S ikonou, jen ikona, odkaz, zakázané">
          <Button>
            <Plus />
            Vypsat akci
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Přidat"
          >
            <Plus />
          </Button>
          <Button variant="link">Zobrazit všechny</Button>
          <Button disabled>Požádat o účast</Button>
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="stitky"
        title="Štítek stavu (Štítek)"
        description="Stav přihlášky nebo vlastnost akce. Údaj o chybějících lidech patří do Místa, ne do štítku."
      >
        <Example label="Čeká na schválení, Schváleno, Zamítnuto, Uzávěrka, Neutrální">
          <StatusBadge status="pending" />
          <StatusBadge status="approved" />
          <StatusBadge status="rejected" />
          <StatusBadge status="deadline">Uzávěrka za 2 dny</StatusBadge>
          <StatusBadge status="neutral" />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="filtry"
        title="Vyhledávání, filtr a přepínač"
        description="Vyhledávání s tlačítkem filtrů, přepínací filtry pod ním a přepínač výpisu mezi mapou a seznamem."
      >
        <Example label="Vyhledávání — tlačítko filtrů otevře spodní panel">
          <SearchWithFilters />
        </Example>
        <Example label="Filtr (vybráno / nevybráno)">
          <FilterExample />
        </Example>
        <Example label="Přepínač Mapa / Seznam">
          <ViewToggle
            value={view}
            onValueChange={setView}
          />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="formulare"
        title="Pole formuláře"
        description="Popisek ve stylu Label L nad polem, hodnota v Body, chybová zpráva pod polem. Placeholder je příklad, nikdy popisek. Ve formulářích používejte Form z components/ui/form."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name">Název akce</Label>
            <Input
              id="ds-name"
              placeholder="Čtvrteční florbal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-place">Místo</Label>
            <Input
              id="ds-place"
              defaultValue="Hala ZŠ Dolní"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-email">E-mail</Label>
            <Input
              id="ds-email"
              type="email"
              defaultValue="honza@"
              aria-invalid
              aria-describedby="ds-email-error"
            />
            <p
              id="ds-email-error"
              className="typo-small text-destructive-ink"
            >
              Zadejte celý e-mail, třeba honza@example.cz.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-note">Vzkaz pro hráče</Label>
            <Textarea
              id="ds-note"
              placeholder="Přijď se podívat, nikdo tě nebude zkoušet z úrovně."
            />
          </div>
          <PhotoPickerExample />
          <Counter
            label="Minimum"
            value={minimum}
            onValueChange={setMinimum}
            min={2}
            max={30}
          />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="kit"
        title="Další prvky z shadcn/ui"
        description="Přestylované jen přes tokeny: hlášení, dialog (poloměr xl, stín float), menu, skeleton a toast."
      >
        <Example label="Hlášení">
          <Alert className="max-w-md">
            <AlertTitle>Akce je naplněná</AlertTitle>
            <AlertDescription>Můžete se zapsat jako náhradník.</AlertDescription>
          </Alert>
          <Alert
            variant="destructive"
            className="max-w-md"
          >
            <AlertTitle>Žádost se nepodařilo odeslat</AlertTitle>
            <AlertDescription>Zkontrolujte připojení a zkuste to znovu.</AlertDescription>
          </Alert>
        </Example>
        <Example label="Dialog, menu, toast">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Zrušit akci…</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zrušit čtvrteční florbal?</DialogTitle>
                <DialogDescription>
                  Všem přihlášeným pošleme e-mail. Zrušení nejde vrátit.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Ponechat</Button>
                <Button variant="destructive">Zrušit akci</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Seřadit
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Nejdřív začínající</DropdownMenuItem>
              <DropdownMenuItem>Nejvíc chybějících</DropdownMenuItem>
              <DropdownMenuItem>Nejblíž</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="secondary"
            onClick={() => toast.success("Žádost odeslána")}
          >
            Ukázat toast
          </Button>
        </Example>
        <Example label="Skeleton">
          <div className="flex w-full max-w-sm items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </Example>
      </ShowcaseSection>
    </>
  )
}
