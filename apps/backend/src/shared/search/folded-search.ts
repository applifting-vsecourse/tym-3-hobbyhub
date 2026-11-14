import { Prisma } from '@/generated/prisma/client';

// The SQL side of the free-text matching in `fold-for-search.ts`.

// The database folds like `foldForSearch` does, but only for the diacritics of
// Czech and Slovak (no `unaccent` extension needed); other accents, such as
// "è", are not matched.
const FOLD_FROM = 'áäčďéěíĺľňóôöŕřšťúůüýž';
const FOLD_TO = 'aacdeeillnooorrstuuuyz';

// True when `needle` (already folded) is part of any of the columns.
export const containsInAny = (
  columns: Prisma.Sql[],
  needle: string,
): Prisma.Sql =>
  Prisma.join(
    columns.map(
      (column) =>
        Prisma.sql`strpos(translate(lower(coalesce(${column}, '')), ${FOLD_FROM}, ${FOLD_TO}), ${needle}) > 0`,
    ),
    ' OR ',
  );
