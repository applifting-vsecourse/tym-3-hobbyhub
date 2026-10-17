#!/usr/bin/env bash
# ============================================================
# Squash every Prisma migration that exists on this branch but
# not on main into ONE migration diffed from main's schema.
#
# Why: a migration is a diff against the schema it was generated
# from. After main moves on (someone merged another migration),
# a branch migration may be mis-ordered or its SQL may no longer
# match. schema.prisma already describes the desired end state,
# so the clean fix is: delete the branch-only migrations and let
# Prisma generate the missing step from main's history.
#
# Usage:
#   scripts/rebase-migrations.sh <migration-name> [--yes] [--dry-run]
#     <migration-name>  kebab-case, e.g. f-03-event-schema
#     --yes             skip the confirmation prompt
#     --dry-run         only show what would be deleted
#
# Needs the local dev database running (`pnpm dev` starts it).
# The database is reset: local data is replaced by the seed.
# ============================================================
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

MIGRATIONS_DIR="apps/backend/prisma/migrations"
BASE_REF="origin/main"
NAME=""
YES=0
DRY_RUN=0

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-1}"
}
die() { echo "Error: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage 0 ;;
    -*) die "unknown option '$arg'" ;;
    *) [[ -z "$NAME" ]] && NAME="$arg" || die "unexpected argument '$arg'" ;;
  esac
done
[[ -n "$NAME" ]] || usage
[[ "$NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || die "migration name must be kebab-case (a-z, 0-9, -, _)"

# ---------- 1. pre-flight ----------
step "Pre-flight"
branch="$(git branch --show-current)"
[[ -n "$branch" ]] || die "detached HEAD; check out your feature branch first"
[[ "$branch" != "main" ]] || die "refusing to run on main"
git fetch --quiet origin main

list_at_ref() { git ls-tree -d --name-only "$1" "$MIGRATIONS_DIR/" | xargs -n1 basename | sort; }
list_worktree() { find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort; }

base_migrations="$(list_at_ref "$BASE_REF")"
branch_only="$(comm -13 <(echo "$base_migrations") <(list_worktree))"

# Migrations shared with main must be byte-identical: they are frozen.
scripts/check-migrations-frozen.sh "$BASE_REF" >/dev/null \
  || { scripts/check-migrations-frozen.sh "$BASE_REF" || true; die "fix the frozen migrations above before rebasing"; }

echo "Branch: $branch"
echo "Newest migration on $BASE_REF: $(echo "$base_migrations" | tail -n1)"
if [[ -z "$branch_only" ]]; then
  echo "No branch-only migrations. A migration will be generated only if schema.prisma differs from $BASE_REF."
else
  echo "Branch-only migrations that will be DELETED and replaced by one '$NAME' migration:"
  echo "$branch_only" | sed 's/^/  /'
fi

if (( DRY_RUN )); then echo; echo "Dry run: stopping here."; exit 0; fi

if (( ! YES )); then
  echo
  read -r -p "Continue? Local database data will be replaced by the seed. [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

# ---------- 2. delete branch-only migrations ----------
if [[ -n "$branch_only" ]]; then
  step "Deleting branch-only migrations"
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    rm -rf "$MIGRATIONS_DIR/$dir"
    echo "  removed $dir"
  done <<< "$branch_only"
fi

# ---------- 3. reset local DB to main's migrations ----------
step "Resetting local database to $BASE_REF's migrations"
# Prisma 7 has no --skip-seed. The seed runs with a client generated from the
# CURRENT schema, so it may fail here when the branch adds models (their tables
# do not exist yet). That is expected; the seed runs again in step 5.
if ! pnpm --filter backend exec prisma migrate reset --force; then
  echo "  (reset reported an error; checking whether the database itself is fine)"
fi
pnpm --filter backend exec prisma migrate status \
  || die "database is not at $BASE_REF's migration state; is Postgres running? (pnpm backend docker:up:wait)"

# ---------- 4. generate the consolidated migration ----------
step "Generating migration '$NAME' from $BASE_REF's schema to schema.prisma"
before="$(list_worktree)"
pnpm --filter backend exec prisma migrate dev --name "$NAME"
new_migration="$(comm -13 <(echo "$before") <(list_worktree))"
if [[ -z "$new_migration" ]]; then
  echo
  echo "Prisma created no migration: schema.prisma already matches $BASE_REF after the deletions."
  echo "Nothing to commit for migrations."
  exit 0
fi
[[ "$(wc -l <<< "$new_migration")" -eq 1 ]] || die "expected exactly one new migration, got:"$'\n'"$new_migration"
echo "  created $new_migration"

# ---------- 5. seed + verify ----------
step "Seeding"
pnpm --filter backend seed

step "Verifying that applied migrations match schema.prisma"
# --exit-code: 0 = no diff, 2 = diff, 1 = error
if pnpm --filter backend exec prisma migrate diff \
     --from-config-datasource --to-schema prisma/schema.prisma --exit-code; then
  echo "  database schema == schema.prisma"
else
  die "schema.prisma and the migrated database differ (see diff above); do not commit this migration"
fi

step "Type-checking backend against the regenerated Prisma client"
pnpm --filter backend exec tsc --noEmit -p tsconfig.build.json

step "Checking migration order against $BASE_REF"
scripts/check-migrations-order.sh "$BASE_REF"

# ---------- 6. report ----------
step "Done"
cat <<MSG
Deleted:  $(if [[ -n "$branch_only" ]]; then echo "$branch_only" | tr '\n' ' '; else echo "(none)"; fi)
Created:  $new_migration
Review:   $MIGRATIONS_DIR/$new_migration/migration.sql

Nothing has been committed. Review the SQL, then commit the removed and the
new migration together, e.g.:
  git add $MIGRATIONS_DIR && git commit -m "chore(backend): squash $NAME migrations"
MSG
