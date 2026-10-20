# Quacker — starter template

Full-stack teaching template: pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

The worked example is the quack feed: `Quack` model → seed → repository → service → `GET`/`POST /api/quacks` (DTO-validated, author taken from the session) → zod schema → TanStack Query → list page + post form. Copy its pattern for new features.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is a contract, not a suggestion — it exists to stop generated screens drifting into generic nested cards.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, seed, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (same as CI)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Migrations

Prisma migrations live in `apps/backend/prisma/migrations/`. Production runs `prisma migrate deploy` on every push to `main`: it applies every migration folder not yet recorded in the database, in timestamp order, and does not check that order against what is already applied.

- **Never edit a migration that is already on `main`.** It is frozen and CI enforces it (`Check migrations on base branch are unchanged`). Editing its SQL changes nothing in production and forces a database reset for everyone locally. Need to fix or extend it? Write a new migration with `pnpm backend prisma:migrations:run`.
- **A migration added in a PR must sort after every migration on `main`.** CI enforces this (`Check migrations order`). When it fails, or after merging `main` into a branch that adds migrations, run `scripts/rebase-migrations.sh <name>` (agents: the `rebase-migrations` skill): it deletes the branch-only migrations and lets Prisma regenerate one from `main`'s schema. Renaming the folder is only safe when `main`'s newer migrations touch unrelated tables; two migrations generated from different schema states can merge cleanly and still fail on deploy.

## Git Commits

- **Format**: `type(scope): short description` - single line, no body
- **Scope**: workspace names like `backend`, `frontend`, `lib` (can combine: `admin, api, worker`)
- **Types**: `feat`, `fix`, `refactor`, `chore`
- **No multi-line descriptions** - single line only
- **Language**: Czech
- Example: `feat(backend): add Stripe subscription`

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Backend module layers

Every module under `apps/backend/src/modules/<entity>/` has the same four folders, and a request runs through them in order: controller → service → repository → database. `domain/` is the vocabulary the other three share. `event` is the fullest example; `quack` the smallest.

- `domain/` — plain TypeScript: no Nest, no Prisma, no HTTP. Types (`Event`), limits as constants (`EVENT_TITLE_MAX_LENGTH`), derived values (`occupancyOf`) and rule functions (`eventRuleViolations`) that return violation codes and never throw. Tested by calling the function.
- `controllers/` — HTTP only: routes, status codes, guards, Swagger, `dto/`. Reads the body, calls the service, maps the result with `ResponseDto.fromDomain`. No rules, no Prisma. The module's `ValidationPipe` lives in its own file (`events-validation.pipe.ts`) so the DTO spec validates exactly what the endpoints do.
- `services/` — the orchestration: runs the domain rules and turns violations into `BadRequestException`, asks other modules' _services_ (never their repositories) for what it needs, fills in what the client must not send, calls the repository. Tested with a mocked repository.
- `repositories/` — the only place that touches Prisma. Queries and the mapping from rows to domain types; the rest of the module never sees a column name like `locationStreet`. Validates nothing — it trusts the layers above.

Where a check goes:

- **Shape and single fields** (type, required, length, range) → the DTO, with `class-validator` decorators reading the limits from `domain/`.
- **Rules between fields of one entity** (end after start, min ≤ max) → a pure function in `domain/`, called by the service. The form checks the same ones before sending; the server is the one that counts.
- **Rules that need data from elsewhere** (the activity exists, the user may do this) → the service.
- **The database** keeps the same limits as CHECK constraints in the migration — the last line of defence, kept in step by hand and covered by `event-schema.spec.ts` (`DB_TESTS=1 pnpm backend test event-schema`).

Who acts comes from the session (`@User()`), never from the request body: the organizer of an event, the author of a quack.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

The CLI sometimes writes `import { cn } from "cn"` and installs an unrelated `cn` package — change the import to `@/lib/utils` and `pnpm remove cn`.

The CLI puts `shadow-xs`/`shadow-sm` on inputs, textareas and cards. [`DESIGN.md`](DESIGN.md) keeps shadows for things that genuinely float — dialogs, dropdowns, toasts. Strip them.

### Forms go through `AppForm`

Build every form with `AppForm` from `src/components/form/AppForm.tsx`, never with `Form` from the kit (ESLint refuses that import). `AppForm` is the `<form>` element, the react-hook-form provider and the unsaved-changes guard in one: leaving a page with a dirty form, inside the app or by closing the tab, asks first, until a submit succeeds. Let a failed save throw from `onSubmit` so react-hook-form records it; the page shows the error from its mutation state. Pass `isGuarded={false}` only where half-typed input costs nothing (sign-in, a one-line post). Tests of guarded forms render through `renderWithRouter` from `src/test/`, because the guard needs the router.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.

### Text lives in translations

No user-facing strings in components — not text, `aria-label`s, placeholders or validation messages. Add the key to both `apps/frontend/src/i18n/locales/cs/common.json` and `.../en/common.json` and read it with `useTranslation()`. Czech is the default and types the keys; a test fails if the two files drift apart. Plurals use `_one`/`_few`/`_other` keys, dates and numbers go through `Intl`. `i18next/no-literal-string` warns about what is still hardcoded.
