---
name: rebase-migrations
description: Squash all branch-only Prisma migrations into one fresh migration generated against main's schema. Use when CI's "Check migrations order" fails, after merging main into a feature branch that adds migrations, or when a branch has a noisy chain of incremental migrations before merging.
---

# Rebase migrations

Goal: replace every migration folder that exists on this branch but not on `main` with **one** migration diffed from `main`'s schema to the current `schema.prisma`. `schema.prisma` already describes the desired end state, so a chain of incremental migrations only records how the branch got there.

All of the work is in a plain shell script so that teammates without an agent can run it too:

```bash
scripts/rebase-migrations.sh <migration-name>
```

`<migration-name>` is kebab-case, ideally with the feature key, e.g. `f-03-event-schema`. If the user did not give one, ask before running.

## What the script does

1. Pre-flight: refuses to run on `main`, fetches `origin/main`, lists branch-only migration folders and stops if any migration that is also on `main` was modified (migrations on `main` are frozen).
2. Asks for confirmation, then deletes the branch-only folders.
3. Resets the local database with `prisma migrate reset --skip-seed`, which replays only `main`'s migrations.
4. Runs `prisma migrate dev --name <name>`: Prisma replays the history into a shadow database, diffs it against `schema.prisma` and writes exactly the missing SQL under a fresh timestamp newer than anything on `main`.
5. Seeds the database and verifies with `prisma migrate diff --exit-code` that the applied migrations now match `schema.prisma`.
6. Runs `scripts/check-migrations-order.sh` as a final check.

Pass `--yes` to skip the confirmation and `--dry-run` to only print what would be deleted.

## After it finishes

- Review the generated `migration.sql` with the user before anything is committed. **Do not commit automatically.**
- If Prisma reports "Already in sync", the schema matches `main` after the deletions and there is nothing to migrate. Say so instead of inventing a migration.
- If the verify step fails, the migration does not produce the schema. Show the full output and stop.
- Suggest committing the removed and the new migration together, e.g. `chore(backend): squash <topic> migrations`.

## Never

- Edit a migration folder that exists on `main`. Write a new migration instead.
- Rename a migration folder to fix ordering when `main`'s newer migrations touch the same tables, columns, enums or foreign keys. Regenerate with this skill instead.
