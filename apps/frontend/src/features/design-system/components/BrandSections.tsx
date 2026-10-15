import { ActivityAvatar, AVATAR_KINDS, AVATARS } from "@/components/hobbyhub/ActivityAvatar"
import { ACTIVITIES, ACTIVITY_KEYS, ActivityIcon } from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"
import { Logo } from "@/components/hobbyhub/Logo"

import { Example, ShowcaseSection } from "@/features/design-system/components/ShowcaseSection"

export function BrandSections() {
  return (
    <>
      <ShowcaseSection
        id="znacka"
        title="Značka (Logo)"
        description="Parta panáčků z deskových her s hlavami různých koníčků. Čárkovaný panáček je volné místo. Barvy z foreground a primary, v tmavém režimu se obracejí; ikona aplikace má pevné barvy."
      >
        <Example
          label="Hlavní logo, symbol, název, ikona aplikace"
          className="items-center gap-8"
        >
          <Logo variant="main" />
          <Logo variant="symbol" />
          <Logo variant="wordmark" />
          <Logo variant="app-icon" />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="ikony"
        title="Ikony aktivit (Ikona)"
        description="16 sportovních a herních ikon: mřížka 24 px, tah 1,75 px, kulaté konce, bez výplní, barva z foreground."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACTIVITY_KEYS.map((activity) => (
            <li
              key={activity}
              className="flex items-center gap-3 typo-small text-foreground"
            >
              <ActivityIcon activity={activity} />
              {ACTIVITIES[activity].label}
            </li>
          ))}
        </ul>
        <Example label="Žeton aktivity — výchozí a vybraný">
          <ActivityToken
            activity="florbal"
            label="Florbal"
          />
          <ActivityToken
            activity="florbal"
            label="Florbal, vybráno"
            isSelected
          />
        </Example>
      </ShowcaseSection>

      <ShowcaseSection
        id="avatary"
        title="Avatary (Avatar)"
        description="Ilustrovaný sportovec nebo koníčkář místo fotografie a iniciál. Obličej je vždy prázdný. Volné místo je čárkovaný kruh."
      >
        <Example label="Aktivity">
          {AVATAR_KINDS.map((kind) => (
            <div
              key={kind}
              className="flex w-20 flex-col items-center gap-1"
            >
              <ActivityAvatar avatar={kind} />
              <span className="text-center typo-caption text-muted-foreground">
                {AVATARS[kind].label}
              </span>
            </div>
          ))}
          <div className="flex w-20 flex-col items-center gap-1">
            <ActivityAvatar avatar="free" />
            <span className="text-center typo-caption text-muted-foreground">Volné místo</span>
          </div>
        </Example>
        <Example
          label="Velikosti xs, sm, md, lg, xl, 2xl"
          className="items-end"
        >
          {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
            <ActivityAvatar
              key={size}
              avatar="tenistka"
              size={size}
            />
          ))}
        </Example>
      </ShowcaseSection>
    </>
  )
}
