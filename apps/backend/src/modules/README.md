# Modules

One folder per entity, each with the same four layers: `controllers/` (HTTP, DTOs), `services/` (orchestration and rules that need other data), `repositories/` (Prisma, row → domain mapping) and `domain/` (plain types, limits and rule functions).

What belongs where, and where each kind of validation goes, is in the root [`CLAUDE.md`](../../../../CLAUDE.md), section "Backend module layers". `event` is the fullest example.
