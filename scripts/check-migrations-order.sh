#!/usr/bin/env bash
# ============================================================
# Check that Prisma migrations added in a PR come after every
# migration already on the base branch.
#
# Prisma applies pending migrations in folder-name (timestamp)
# order and never checks that order against what production
# already applied. A migration with an older timestamp than the
# newest one on main would run in a different order on a clean
# database (CI, new teammate, `db:reset`) than on production.
#
# Usage:
#   scripts/check-migrations-order.sh [BASE_REF] [HEAD_REF]
#     BASE_REF  defaults to origin/main
#     HEAD_REF  defaults to the working tree
# ============================================================
set -euo pipefail

MIGRATIONS_DIR="apps/backend/prisma/migrations"
BASE_REF="${1:-origin/main}"
HEAD_REF="${2:-}"

# Make sure the base ref is available (CI checkouts are shallow).
if [[ "$BASE_REF" == origin/* ]]; then
  git fetch --quiet --depth=1 origin "${BASE_REF#origin/}:refs/remotes/$BASE_REF" 2>/dev/null \
    || git fetch --quiet origin "${BASE_REF#origin/}"
fi

list_migrations_at_ref() {
  git ls-tree -d --name-only "$1" "$MIGRATIONS_DIR/" | xargs -n1 basename | sort
}

list_migrations_in_worktree() {
  find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
}

base_migrations="$(list_migrations_at_ref "$BASE_REF")"
if [[ -n "$HEAD_REF" ]]; then
  head_migrations="$(list_migrations_at_ref "$HEAD_REF")"
else
  head_migrations="$(list_migrations_in_worktree)"
fi

# comm needs sorted input; -13 keeps lines only present in the second list.
new_migrations="$(comm -13 <(echo "$base_migrations") <(echo "$head_migrations"))"

if [[ -z "$new_migrations" ]]; then
  echo "No new migrations compared to $BASE_REF."
  exit 0
fi

last_base="$(echo "$base_migrations" | tail -n1)"
last_base_ts="${last_base%%_*}"
echo "Newest migration on $BASE_REF: ${last_base:-<none>}"
echo "New migrations in this branch:"
echo "$new_migrations" | sed 's/^/  /'
echo

if [[ -z "$last_base" ]]; then
  echo "Base branch has no migrations; nothing to order against."
  exit 0
fi

misplaced=()
while IFS= read -r migration; do
  ts="${migration%%_*}"
  if [[ ! "$ts" =~ ^[0-9]{14}$ ]]; then
    echo "Error: '$migration' does not start with a 14-digit timestamp."
    misplaced+=("$migration")
  elif (( ts <= last_base_ts )); then
    echo "Error: '$migration' is not newer than '$last_base' on $BASE_REF."
    misplaced+=("$migration")
  fi
done <<< "$new_migrations"

if (( ${#misplaced[@]} == 0 )); then
  echo "All new migrations come after the newest migration on $BASE_REF."
  exit 0
fi

suggested_ts="$(date -u +%Y%m%d%H%M%S)"
cat <<MSG

Migrations on $BASE_REF are frozen and are applied in timestamp order, so a
new migration must sort after '$last_base'. Your migration was generated
without the newer migrations on $BASE_REF, so its SQL may no longer match.

Fix (always correct): merge $BASE_REF into this branch, then regenerate:

  scripts/rebase-migrations.sh <migration-name>

It deletes the branch-only migrations, resets the local database to $BASE_REF's
migrations and lets Prisma write exactly the missing SQL under a fresh
timestamp. Agents can use the 'rebase-migrations' skill in .agents/skills/.

Shortcut (only if the newer migrations on $BASE_REF touch different tables,
columns, enums and foreign keys than yours): rename the folder.
MSG
for migration in "${misplaced[@]}"; do
  name="${migration#*_}"
  echo "  git mv $MIGRATIONS_DIR/$migration $MIGRATIONS_DIR/${suggested_ts}_$name"
done
cat <<MSG
Then run \`pnpm backend db:reset\` so Prisma does not see the old folder name
as an applied-but-missing migration.
MSG
exit 1
