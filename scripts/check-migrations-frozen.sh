#!/usr/bin/env bash
# ============================================================
# Check that no Prisma migration already on the base branch was
# modified, deleted or renamed.
#
# Migrations on main are frozen: production has already applied
# them and `prisma migrate deploy` never re-runs a recorded
# migration, so editing one changes nothing there and only makes
# local databases and CI diverge from production. Fix or extend
# a migration by adding a new one.
#
# Usage:
#   scripts/check-migrations-frozen.sh [BASE_REF] [HEAD_REF]
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

# --no-renames: a renamed migration shows up as D + A, and the D is what we
# want to see. Additions (A) are the only allowed change.
if [[ -n "$HEAD_REF" ]]; then
  changes="$(git diff --no-renames --name-status "$BASE_REF" "$HEAD_REF" -- "$MIGRATIONS_DIR/")"
else
  changes="$(git diff --no-renames --name-status "$BASE_REF" -- "$MIGRATIONS_DIR/")"
fi

violations="$(echo "$changes" | awk '$1 != "A" && NF' || true)"

if [[ -z "$violations" ]]; then
  echo "Migrations present on $BASE_REF are unchanged."
  exit 0
fi

echo "Migrations on $BASE_REF were modified or removed in this branch:"
echo "$violations" | awk '{
  status = ($1 == "M") ? "modified" : ($1 == "D") ? "deleted" : $1
  printf "  %-9s %s\n", status, $2
}'
cat <<MSG

Migrations that are already on $BASE_REF are frozen. Production has applied
them and \`prisma migrate deploy\` never re-runs a recorded migration, so this
change would not reach production and would make every other database differ
from it.

Fix: restore the original folders and add a new migration instead.
  git checkout $BASE_REF -- $MIGRATIONS_DIR
  pnpm backend prisma:migrations:run
MSG
exit 1
