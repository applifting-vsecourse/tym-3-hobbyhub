# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, type, radius, shadows and motion; its values come from the Figma file _HobbyHub – návrh designu_ (pages _Design system_ and _Komponenty_). This file says how to _use_ them. When Figma and the tokens disagree, change the tokens — never patch a value in a component.

**Domain components live in `apps/frontend/src/components/hobbyhub/`** (seats, roster, event cards, pins, loaders…). Build screens from them and from `components/ui`; don't re-draw a seat or a roster in a feature folder. Every token and component is shown on the `/design-system` page — add new ones there too.

## Colour

- **Never hardcode a colour in a component.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `border-border`, `border-input`, `bg-overlay`, plus the state families below.
- The only hex values outside `global.css` are the `theme-color` metas in `index.html` (they mirror `--background` in each theme) and illustrations that carry their own palette: avatars, the app icon, event photos.
- **UI SVGs are coloured by tokens**: `currentColor` for icons, `var(--primary)`, `var(--signal)`, `var(--success)`… for pins and loaders. Never bake a hex into an icon, or it breaks in dark mode.
- **`primary` is for actions and for the user's place in the app**: buttons, filled (taken) seats, the active bottom-nav item and its badge dot. Not decoration. One primary button per view; everything else is `outline`, `ghost`, `secondary` or a plain link.
- **`accent` is the quiet violet tint, not the brand colour.** It is the hover/active surface of menu items and ghost buttons, the text colour of ghost buttons (`text-accent-foreground`), and the surface that invites the visitor in: `YourSeat`, the time pill and roster band on `EventCard`, a selected `ActivityToken`. Text on it is `text-accent-foreground`.
- **`destructive` only for destructive actions and errors.** Never for emphasis.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level. On the dark signal surface the same two levels are `signal-foreground` and `signal-soft`.
- **States have four tokens each**: `signal` (people are missing — graphite and dashes), `success` (approved, full), `pending` (waiting for approval), `destructive` (error, irreversible). Solid `bg-{state}` + `text-{state}-foreground`, or a soft surface `bg-{state}-soft` with `text-{state}-ink`.
- **`signal` means "people are missing" and nothing else.** As line work it marks empty places: the dashes of a missing `Seat`, the dashed free `ActivityAvatar`, the map pin with a missing count, `text-signal-ink` for the missing count in roster rows. As a solid surface it is rare: the `Hero`, the roster band in e-mails, the desktop roster card, the "chybí N" pill and the "Uzávěrka" badge. Nowhere else.
- How many people are missing is shown with seats (`Seat`, `SeatMeter`, `RosterSeats`), never as a percentage and never inside a status badge. "Missing" always counts towards the minimum.
- **Every screen works in both themes.** The header theme switcher flips `.dark` on the root; check new UI in both on `/design-system`. `.light` forces light values inside a dark page and exists for the design-system page only.

## Layout

- **Cards are for separable items in a list** — an event, a join request, a search result. They are not page sections and not layout tools.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing, a hairline divider or a tinted band (like the roster band on `EventCard`).
- **A page is not a card.** Page content sits on `background` in a centred column (`max-w-2xl` for reading, `max-w-4xl` for wide layouts), not inside a floating panel. The `Hero` is the one coloured section surface, and a screen has at most one.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- Forbidden by default: the centred-hero-plus-three-feature-cards layout, carousels, and any section whose only purpose is to look full.

## Spacing

- **Screens use the scale only**: `1, 2, 3, 4, 6, 8, 12, 16` (Tailwind units — 4px…64px). Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`.
- **Inside `components/hobbyhub/`**, sizes and offsets follow the Figma geometry and may use finer steps (`size-5.5`, `gap-0.75`, `px-3.5`). That precision stays inside the component — a screen composing components goes back to the scale.
- Arbitrary values (`p-[13px]`) are not allowed. The exceptions are values the scale cannot express: viewport units (`max-h-[85vh]`), safe-area insets (`pb-[max(1.5rem,env(safe-area-inset-bottom))]`), percentages, grid templates, and the 3 px focus ring (`ring-[3px]`) used by the kit.

## Type

- One `h1` per page. Headings step down without skipping.
- Use the type styles, not raw sizes: `typo-display`, `typo-h1`, `typo-h2`, `typo-h3`, `typo-title`, `typo-body-lg`, `typo-body`, `typo-label-lg`, `typo-label`, `typo-small`, `typo-caption`. They carry font, size, line height, weight and tracking — don't add `text-sm`, `font-semibold` or `tracking-*` next to them.
- One `typo-*` per element per breakpoint. tailwind-merge does not know these classes, so two of them on one element are resolved by stylesheet order, not by the order you wrote them. Responsive steps are fine: `typo-h1 lg:typo-display`.
- Headings and numbers are Outfit, everything else Inter. Time and seat counts have their own styles (`typo-time`, `typo-numeral`) because they are the main content of a card — only the time is big.
- Field labels use `typo-label-lg` (the `Label` component already does). Buttons and nav links use `typo-label`; badges use `typo-caption`.
- Sentence case everywhere. No ALL CAPS.

## Surfaces

- **Borders are hairlines**: `border border-border`. One border, not two adjacent ones. Form fields and free seats use the stronger `border-input`; dashed borders mean an empty place (`signal`) or an invitation to take it (`primary` on `YourSeat`).
- **One shadow, `shadow-float`** (`drop-shadow-float` for pins). Only for things that genuinely float — map pins, dropdowns, popovers, dialogs, toasts. Cards and inputs do not get shadows, and there are no gradients. The smaller shadow steps (`shadow-xs`, `shadow-sm`) are deliberately empty in the tokens, so a stray one from the shadcn CLI renders nothing — still delete it.
- **Radius hierarchy**: menu items `rounded-sm`; fields, buttons, menus and photos inside cards `rounded-md`; cards and bordered blocks `rounded-lg`; the event card, `Hero`, dialogs and the drawer's top edge `rounded-xl`; seats, avatars, chips, badges, pills and the search field `rounded-full`. Never mix radii in one component. The bottom-nav "Přidat" button is the one exception: it reproduces the app-icon shape.
- Scrims behind dialogs and drawers are `bg-overlay`.

## Icons and illustrations

- Activity icons come from `ActivityIcon` (24 px grid, 1.75 px stroke, `currentColor`); UI icons from `src/assets/ui-icons/` imported as components (`?react`). Size them with `size-*`.
- Icons are decorative (`aria-hidden`) unless they stand alone — then they get a label.
- People are drawn as `ActivityAvatar` illustrations — never photos or initials, and the face is always blank. An empty place is the dashed free avatar with a plus.
- The logo comes from `Logo`; the header shows the wordmark on phones and the full logo from `sm`.

## Forms

- Every input has a visible `<label>`. Placeholders are examples, never labels. (The pill search field is the one exception: its label is `sr-only`.)
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.
- Numbers of people are entered with `Counter`, photos with `PhotoPicker`.

## Phones first

- Every screen works at 375 px wide with no horizontal scroll. Layouts stack below `md` and go side by side from `md`.
- Touch targets are at least 44 px on phones (buttons M and `icon`, filter chips `h-11 md:h-9`). The S sizes (`sm`, `icon-sm`) are for `md` and up, or must be made 44 px on phones the same way.
- Secondary tasks that keep the page underneath — filters, sharing an event — open in `ResponsiveSheet`: a bottom drawer on phones, a dialog from `md`. Its one primary action sits at the bottom, full width. Use the ready-made `FiltersSheet` and `ShareEventSheet`.
- Fixed bottom UI (`BottomNav`) respects the safe-area inset.

## Buttons and loaders

- **One primary action per screen.** Destructive only for irreversible actions and never next to a filled primary. Sizes: M (`default`, 44 px) and S (`sm`, 36 px); icon buttons `icon` (44 px) and `icon-sm` (36 px).
- The main action of a free seat ("Obsadit místo") sits inside `YourSeat`, not under it.
- A loader appears only after 300 ms, there is only one at a time, it always has a text label and it stands still under reduced motion — use `Loader`, pick the variant by context. Any other animation is also wrapped in `motion-safe:`.

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`. Anything that changes the route is a link, including bottom-nav items.
- Every icon-only control has an `aria-label`.
- Graphics that carry numbers (`SeatMeter`, `RosterSeats`, `MapPin`) are `role="img"` with the numbers in their accessible name.
- Focus rings are never removed. If you restyle focus, it must stay clearly visible.
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
