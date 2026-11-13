// The activity catalogue (ADR-0020) is written out by hand in several places:
// the migrations, the seed, and the frontend's icon keys and translations. This
// keeps the seed and the frontend in step without a database; the migrations
// are compared with the seed in activity-catalog.spec.ts (DB_TESTS=1).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACTIVITY_CATEGORIES,
  POPULAR_ACTIVITY_ICONS,
} from '@/scripts/seed/seed/seed-events';

type Translations = {
  hobbyhub: {
    activities: Record<string, string>;
    activityCategories: Record<string, string>;
  };
};

// Czech is the frontend's default language; a frontend test keeps English in step with it.
const czech = JSON.parse(
  readFileSync(
    join(__dirname, '../../../../frontend/src/i18n/locales/cs/common.json'),
    'utf8',
  ),
) as Translations;

const activityIcons = ACTIVITY_CATEGORIES.flatMap((category) =>
  category.activities.map((activity) => activity.icon),
);

describe('activity catalogue in the seed', () => {
  it('has 14 categories ordered 1–14 and 98 activities, each key once', () => {
    expect(ACTIVITY_CATEGORIES.map((category) => category.order)).toEqual(
      Array.from({ length: 14 }, (_, index) => index + 1),
    );
    expect(activityIcons).toHaveLength(98);
    expect(new Set(activityIcons).size).toBe(98);
  });

  it('uses exactly the category and activity keys the frontend translates', () => {
    expect(ACTIVITY_CATEGORIES.map((category) => category.icon).sort()).toEqual(
      Object.keys(czech.hobbyhub.activityCategories).sort(),
    );
    expect([...activityIcons].sort()).toEqual(
      Object.keys(czech.hobbyhub.activities).sort(),
    );
  });

  it('ranks 40 distinct activities of the catalogue', () => {
    expect(POPULAR_ACTIVITY_ICONS).toHaveLength(40);
    expect(new Set(POPULAR_ACTIVITY_ICONS).size).toBe(40);
    expect(
      POPULAR_ACTIVITY_ICONS.filter((icon) => !activityIcons.includes(icon)),
    ).toEqual([]);
  });
});
