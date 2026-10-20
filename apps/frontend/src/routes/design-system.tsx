import { createFileRoute } from "@tanstack/react-router"

import { Logo } from "@/components/hobbyhub/Logo"
import { Seo } from "@/components/Seo"

import { AppShell } from "@/features/auth/components/AppShell"
import { BrandSections } from "@/features/design-system/components/BrandSections"
import { ControlSections } from "@/features/design-system/components/ControlSections"
import { DomainSections } from "@/features/design-system/components/DomainSections"
import { FoundationSections } from "@/features/design-system/components/FoundationSections"
import { SheetSection } from "@/features/design-system/components/SheetDemos"

export const Route = createFileRoute("/design-system")({
  component: DesignSystemPage,
})

const CONTENTS = [
  { id: "barvy", label: "Barvy" },
  { id: "typografie", label: "Typografie" },
  { id: "mezery", label: "Mezery a poloměry" },
  { id: "znacka", label: "Značka" },
  { id: "ikony", label: "Ikony" },
  { id: "avatary", label: "Avatary" },
  { id: "tlacitka", label: "Tlačítka" },
  { id: "stitky", label: "Štítky" },
  { id: "filtry", label: "Vyhledávání a filtry" },
  { id: "formulare", label: "Formuláře" },
  { id: "kit", label: "shadcn/ui" },
  { id: "spodni-panel", label: "Spodní panel" },
  { id: "mista", label: "Místa" },
  { id: "soupiska", label: "Soupiska" },
  { id: "hrdinska-plocha", label: "Hrdinská plocha" },
  { id: "karty", label: "Karty akce" },
  { id: "radek-soupisky", label: "Soupiska a žádosti" },
  { id: "mapa", label: "Mapa" },
  { id: "navigace", label: "Navigace" },
  { id: "loadery", label: "Loadery" },
]

/**
 * Living catalogue of the HobbyHub design system (Figma "HobbyHub – návrh
 * designu", pages Design system and Komponenty). Every token and component
 * that screens are built from is shown here, in both themes via the header
 * theme switcher.
 */
function DesignSystemPage() {
  return (
    <>
      <Seo title="Design system" />
      <AppShell>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-12">
          <header className="flex flex-col gap-4">
            <Logo className="h-10 self-start" />
            <h1 className="typo-h1 text-foreground">Rozpis a soupiska</h1>
            <p className="max-w-2xl typo-body-lg text-muted-foreground">
              Design systém aplikace HobbyHub. Místa u stolu místo procent, čárkování znamená chybí
              a čas je hlavní písmo. Postavený na shadcn/ui s vlastní vrstvou pro doménu akcí,
              soupisek a stavů přihlášek.
            </p>
            <nav aria-label="Obsah">
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {CONTENTS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="typo-small text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <FoundationSections />
          <BrandSections />
          <ControlSections />
          <SheetSection />
          <DomainSections />
        </div>
      </AppShell>
    </>
  )
}
