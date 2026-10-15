# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, type, radius and shadows; its values come from the Figma file _HobbyHub – návrh designu_ (pages _Design system_ and _Komponenty_). This file says how to _use_ them.

**Domain components live in `apps/frontend/src/components/hobbyhub/`** (seats, roster, event cards, pins, loaders…). Build screens from them and from `components/ui`; don't re-draw a seat or a roster in a feature folder. Every token and component is shown on the `/design-system` page — add new ones there too.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`, plus the state families below.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`destructive` only for destructive actions and errors.** Never for emphasis.
- **`accent` is a hover/active surface, not a brand colour.** It tints menu items and ghost buttons on hover, so it must stay quiet. The brand colour is `primary`.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.
- **States have four tokens each**: `signal` (people are missing — graphite and dashes), `success` (approved, full), `pending` (waiting for approval), `destructive` (error, irreversible). Solid `bg-{state}` + `text-{state}-foreground`, or a soft surface `bg-{state}-soft` with `text-{state}-ink`.
- **`signal` is rare.** Only the hero surface, the roster band in e-mails, the desktop roster card and the "chybí N" pill. Nowhere else.
- How many people are missing is shown with seats (`Seat`, `SeatMeter`, `RosterSeats`), never as a percentage and never inside a status badge. "Missing" always counts towards the minimum.

## Layout

- **Cards are for separable items in a list** — a quack, a search result, a product. They are not page sections and not layout tools.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider.
- **A page is not a card.** Page content sits on `background` in a centred column (`max-w-2xl` for reading, `max-w-4xl` for wide layouts), not inside a floating panel.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- Forbidden by default: the centred-hero-plus-three-feature-cards layout, carousels, and any section whose only purpose is to look full.

## Spacing

Use the scale only: `1, 2, 3, 4, 6, 8, 12, 16` (Tailwind units — 4px…64px). No arbitrary values like `p-[13px]`. Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`.

## Type

- One `h1` per page. Headings step down without skipping.
- Use the type styles, not raw sizes: `typo-display`, `typo-h1`, `typo-h2`, `typo-h3`, `typo-title`, `typo-body-lg`, `typo-body`, `typo-label-lg`, `typo-label`, `typo-small`, `typo-caption`. They carry font, size, line height, weight and tracking.
- Headings and numbers are Outfit, everything else Inter. Time and seat counts have their own styles (`typo-time`, `typo-numeral`) because they are the main content of a card — only the time is big.
- Field labels use `typo-label-lg` (the `Label` component already does).
- Sentence case everywhere. No ALL CAPS.

## Surfaces

- **Borders are hairlines**: `border border-border`. One border, not two adjacent ones.
- **One shadow, `shadow-float`** (`drop-shadow-float` for pins). Only for things that genuinely float — map pins, dropdowns, popovers, dialogs, toasts. Cards and inputs do not get shadows, and there are no gradients.
- Radius hierarchy: fields and buttons `rounded-md`, cards `rounded-lg`, the event card and dialogs `rounded-xl`, seats, filters and pills `rounded-full`. Never mix radii in one component.

## Forms

- Every input has a visible `<label>`. Placeholders are examples, never labels. (The pill search field is the one exception: its label is `sr-only`.)
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.

## Phones first

- Every screen works at 375 px wide with no horizontal scroll. Layouts stack below `md` and go side by side from `md`.
- Touch targets are at least 44 px on phones (buttons M, filter chips `h-11 md:h-9`).
- Secondary tasks that keep the page underneath — filters, sharing an event — open in `ResponsiveSheet`: a bottom drawer on phones, a dialog from `md`. Its one primary action sits at the bottom, full width. Use the ready-made `FiltersSheet` and `ShareEventSheet`.

## Buttons and loaders

- **One primary action per screen.** Destructive only for irreversible actions and never next to a filled primary. Sizes: M (`default`, 44 px) and S (`sm`, 36 px).
- The main action of a free seat ("Obsadit místo") sits inside `YourSeat`, not under it.
- A loader appears only after 300 ms, there is only one at a time, it always has a text label and it stands still under reduced motion — use `Loader`, pick the variant by context.

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`.
- Every icon-only control has an `aria-label`.
- Focus rings are never removed. If you restyle focus, it must stay clearly visible.
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
