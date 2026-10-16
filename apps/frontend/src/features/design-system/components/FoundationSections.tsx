import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { Example, ShowcaseSection } from "@/features/design-system/components/ShowcaseSection"

const COLOR_GROUPS = [
  { label: "Povrchy", tokens: ["background", "card", "popover", "muted", "secondary", "accent"] },
  {
    label: "Text",
    tokens: [
      "foreground",
      "card-foreground",
      "popover-foreground",
      "muted-foreground",
      "secondary-foreground",
      "accent-foreground",
    ],
  },
  {
    label: "Akce a ohraničení",
    tokens: ["primary", "primary-foreground", "ring", "border", "input"],
  },
  {
    label: "Stav: chybí lidé (grafit a čárkování)",
    tokens: ["signal", "signal-foreground", "signal-soft", "signal-ink"],
  },
  {
    label: "Stav: úspěch",
    tokens: ["success", "success-foreground", "success-soft", "success-ink"],
  },
  { label: "Stav: čeká", tokens: ["pending", "pending-foreground", "pending-soft", "pending-ink"] },
  {
    label: "Stav: chyba, nevratná akce",
    tokens: ["destructive", "destructive-foreground", "destructive-soft", "destructive-ink"],
  },
]

function Swatch({ token }: { token: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState("")

  // Read the resolved value from the panel so the page can never drift from
  // global.css, and shows the dark values inside the dark panel.
  useEffect(() => {
    if (ref.current) {
      setValue(getComputedStyle(ref.current).getPropertyValue(`--${token}`).trim())
    }
  }, [token])

  return (
    <div className="flex w-28 flex-col gap-1">
      <div
        ref={ref}
        className="h-11 rounded-md border border-border"
        style={{ background: `var(--${token})` }}
      />
      <p className="typo-caption text-foreground">{token}</p>
      <p className="typo-caption text-muted-foreground">{value}</p>
    </div>
  )
}

function ColorPanel({ mode }: { mode: "light" | "dark" }) {
  return (
    <div
      className={cn(
        mode,
        "flex flex-col gap-6 rounded-xl border border-border bg-background p-6 text-foreground",
      )}
    >
      <h3 className="typo-h3">{mode === "light" ? "Světlý režim" : "Tmavý režim"}</h3>
      {COLOR_GROUPS.map((group) => (
        <div
          key={group.label}
          className="flex flex-col gap-2"
        >
          <p className="typo-label text-muted-foreground">{group.label}</p>
          <div className="flex flex-wrap gap-3">
            {group.tokens.map((token) => (
              <Swatch
                key={token}
                token={token}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TYPE_STYLES = [
  {
    name: "Display",
    className: "typo-display",
    spec: "Outfit SemiBold, 44/48, −2 %",
    sample: "Rozpis a soupiska",
  },
  {
    name: "H1",
    className: "typo-h1",
    spec: "Outfit SemiBold, 32/38, −1,5 %",
    sample: "Čtvrteční florbal",
  },
  { name: "H2", className: "typo-h2", spec: "Outfit SemiBold, 24/30", sample: "Dnes večer" },
  { name: "H3", className: "typo-h3", spec: "Outfit Medium, 20/26", sample: "Karta akce" },
  {
    name: "Title",
    className: "typo-title",
    spec: "Outfit Medium, 17/22",
    sample: "Deskovky v herně",
  },
  {
    name: "Numeral",
    className: "typo-numeral",
    spec: "Outfit SemiBold, 32/32, −2 %",
    sample: "7/10",
  },
  { name: "Time", className: "typo-time", spec: "Outfit SemiBold, 28/30, −2 %", sample: "19:00" },
  {
    name: "Body L",
    className: "typo-body-lg",
    spec: "Inter Regular, 17/26",
    sample: "Pravidelná skupina hledá dva hráče na čtvrteční zápas.",
  },
  {
    name: "Body",
    className: "typo-body",
    spec: "Inter Regular, 15/22",
    sample: "Přijď se podívat, nikdo tě nebude zkoušet z úrovně.",
  },
  {
    name: "Label L",
    className: "typo-label-lg",
    spec: "Inter Medium, 15/22",
    sample: "Popisek pole",
  },
  {
    name: "Label",
    className: "typo-label",
    spec: "Inter Medium, 14/20",
    sample: "Požádat o účast",
  },
  {
    name: "Small",
    className: "typo-small",
    spec: "Inter Regular, 13/18",
    sample: "Hala ZŠ Dolní, pokročilí",
  },
  {
    name: "Caption",
    className: "typo-caption",
    spec: "Inter Medium, 12/16, +2 %",
    sample: "Čeká na schválení",
  },
]

const SPACES = [
  { name: "space/1", px: 4, className: "w-1" },
  { name: "space/2", px: 8, className: "w-2" },
  { name: "space/3", px: 12, className: "w-3" },
  { name: "space/4", px: 16, className: "w-4" },
  { name: "space/6", px: 24, className: "w-6" },
  { name: "space/8", px: 32, className: "w-8" },
  { name: "space/12", px: 48, className: "w-12" },
]

const RADII = [
  { name: "sm", value: "8 px", className: "rounded-sm" },
  { name: "md", value: "12 px", className: "rounded-md" },
  { name: "lg", value: "16 px", className: "rounded-lg" },
  { name: "xl", value: "24 px", className: "rounded-xl" },
  { name: "pill", value: "pill", className: "rounded-full" },
]

export function FoundationSections() {
  return (
    <>
      <ShowcaseSection
        id="barvy"
        title="Barvy"
        description="Dva režimy, jedna sada proměnných. Fialová je akce, grafit a čárkování jsou nedostatek, zelená a cihlová červená jsou stavy."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ColorPanel mode="light" />
          <ColorPanel mode="dark" />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="typografie"
        title="Typografie"
        description="Nadpisy a čísla v Outfit, ostatní text v Inter. Čas a počet míst mají vlastní styly, protože jsou hlavním obsahem karty. Třídy typo-*."
      >
        <dl className="flex flex-col">
          {TYPE_STYLES.map((style) => (
            <div
              key={style.name}
              className="grid gap-2 border-b border-border py-3 sm:grid-cols-[12rem_1fr] sm:items-center"
            >
              <dt className="flex flex-col">
                <span className="typo-label text-foreground">
                  {style.name}{" "}
                  <code className="typo-caption text-muted-foreground">{style.className}</code>
                </span>
                <span className="typo-caption text-muted-foreground">{style.spec}</span>
              </dt>
              <dd className={cn(style.className, "text-foreground")}>{style.sample}</dd>
            </div>
          ))}
        </dl>
      </ShowcaseSection>

      <ShowcaseSection
        id="mezery"
        title="Mezery, poloměry a stín"
        description="Čtyřbodová stupnice mezer, hierarchie poloměrů (pole a tlačítka md, karty lg, karta akce a dialogy xl, místa a filtry pill) a jediný stín pro plovoucí prvky."
      >
        <Example label="Mezery">
          <ul className="flex flex-col gap-3">
            {SPACES.map((space) => (
              <li
                key={space.name}
                className="flex items-center gap-4"
              >
                <span className={cn("h-3 rounded-full bg-primary", space.className)} />
                <span className="typo-small text-muted-foreground">
                  {space.name} · {space.px} px
                </span>
              </li>
            ))}
          </ul>
        </Example>
        <Example label="Poloměry">
          {RADII.map((radius) => (
            <div
              key={radius.name}
              className="flex flex-col items-center gap-1"
            >
              <span className={cn("size-12 border border-ring bg-accent", radius.className)} />
              <span className="typo-caption text-foreground">{radius.name}</span>
              <span className="typo-caption text-muted-foreground">{radius.value}</span>
            </div>
          ))}
        </Example>
        <Example label="Stín: float">
          <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-popover px-3 py-2 shadow-float">
            <span className="typo-label text-popover-foreground">Pin, popover, dialog</span>
            <span className="typo-small text-muted-foreground">Nic jiného stín nemá.</span>
          </div>
        </Example>
      </ShowcaseSection>
    </>
  )
}
