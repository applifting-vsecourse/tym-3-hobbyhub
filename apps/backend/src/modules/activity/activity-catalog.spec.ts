// The activity catalogue after migration 20261109130000_kategorie_aktivit
// (ADR-0020). Needs a real PostgreSQL with the migrations applied and only runs
// on request:  DB_TESTS=1 pnpm backend test activity-catalog
//
// Read-only: nothing is written. Demo data and other suites may add their own
// categories, so the checks look for the catalogue, not for an exact table.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ActivityRepository } from '@/modules/activity/repositories/activity.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const MAIN_CATEGORIES = [
  'micove-sporty',
  'raketove-sporty',
  'presnost',
  'zimni-sporty',
  'tanec',
  'fitness',
  'beh-a-kolo',
  'outdoor',
  'vodni-sporty',
  'bojove-sporty',
  'deskove-a-karetni-hry',
  'videohry',
  'kvizy-a-terenni-hry',
  'ostatni',
];

// The 16 activities from before ADR-0020 and where they moved.
const MOVED_ACTIVITIES: Record<string, string> = {
  fotbal: 'micove-sporty',
  florbal: 'micove-sporty',
  volejbal: 'micove-sporty',
  basketbal: 'micove-sporty',
  tenis: 'raketove-sporty',
  badminton: 'raketove-sporty',
  'stolni-tenis': 'raketove-sporty',
  cviceni: 'fitness',
  beh: 'beh-a-kolo',
  cyklistika: 'beh-a-kolo',
  turistika: 'outdoor',
  plavani: 'vodni-sporty',
  'deskove-hry': 'deskove-a-karetni-hry',
  sachy: 'deskove-a-karetni-hry',
  'lan-party': 'videohry',
  ostatni: 'ostatni',
};

describeDb('activity catalogue', () => {
  const prisma = new PrismaService();
  const repository = new ActivityRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has the 14 main categories in order 1–14', async () => {
    const categories = await prisma.activityCategory.findMany({
      where: { icon: { in: MAIN_CATEGORIES } },
      orderBy: { order: 'asc' },
    });

    expect(categories.map((category) => category.icon)).toEqual(
      MAIN_CATEGORIES,
    );
    expect(categories.map((category) => category.order)).toEqual(
      MAIN_CATEGORIES.map((_, index) => index + 1),
    );
  });

  it('no longer has the old Sport and Hry categories', async () => {
    const old = await prisma.activityCategory.count({
      where: { name: { in: ['Sport', 'Hry'] } },
    });

    expect(old).toBe(0);
  });

  it('keeps the original 16 activities, each in its new category', async () => {
    const activities = await prisma.activity.findMany({
      // Other suites create their own "florbal" in a throwaway category meanwhile.
      where: {
        icon: { in: Object.keys(MOVED_ACTIVITIES) },
        category: { icon: { in: MAIN_CATEGORIES } },
      },
      include: { category: true },
    });

    expect(activities).toHaveLength(16);
    for (const activity of activities) {
      expect(activity.category.icon).toBe(MOVED_ACTIVITIES[activity.icon]);
    }
  });

  it('offers activities grouped by category, in category order', async () => {
    const activities = await repository.getActiveActivities();
    const catalogue = activities.filter((activity) =>
      MAIN_CATEGORIES.includes(activity.category.icon),
    );

    expect(catalogue.length).toBeGreaterThanOrEqual(98);
    expect(
      catalogue.find((activity) => activity.icon === 'lukostrelba')?.category
        .icon,
    ).toBe('presnost');

    // Name order within a category is the database collation's; only the
    // grouping is checked here.
    const orders = catalogue.map((activity) => activity.category.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
