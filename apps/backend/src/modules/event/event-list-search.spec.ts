// The text search of the public list against a real PostgreSQL, because its
// diacritics folding and its rule "a private venue is never found" live in SQL.
// Like event-schema.spec.ts it only runs on request:
//   DB_TESTS=1 pnpm backend test event-list-search
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventStatus, Prisma, VenueType } from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

// A word no real event contains, so the cases only see their own events.
const MARK = 'zqxmark';
const NOW = new Date('2029-12-31T00:00:00Z');

describeDb('public event list search', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Creates events from `overrides` in a transaction, runs `check` with a
  // repository on that transaction, then rolls everything back.
  const withEvents = async (
    overrides: Partial<Prisma.EventUncheckedCreateInput>[],
    check: (repository: EventRepository, ids: string[]) => Promise<void>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        const suffix = Math.random().toString(36).slice(2);
        const user = await tx.user.create({
          data: {
            id: `test-${suffix}`,
            name: 'Test User',
            email: `test-${suffix}@example.com`,
            emailVerified: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        });
        const category = await tx.activityCategory.create({
          data: { name: `cat-${suffix}` },
        });
        const activity = await tx.activity.create({
          data: {
            name: `Šachy ${suffix}`,
            icon: 'sachy',
            categoryId: category.id,
            defaultMinParticipants: 2,
            defaultMaxParticipants: 10,
          },
        });
        const ids: string[] = [];
        for (const [index, override] of overrides.entries()) {
          const start = new Date(`2030-01-0${index + 1}T18:00:00Z`);
          const event = await tx.event.create({
            data: {
              title: `${MARK} akce ${index}`,
              description: 'Test',
              status: EventStatus.PUBLISHED,
              venueType: VenueType.PUBLIC_VENUE,
              startAt: start,
              endAt: new Date(start.getTime() + 2 * 3600 * 1000),
              minParticipants: 4,
              maxParticipants: 8,
              fillDeadlineHours: 3,
              locationStreet: 'Ulice 1',
              locationCity: 'Praha',
              locationPostalCode: '11000',
              locationCountry: 'Česko',
              activityId: activity.id,
              organizerId: user.id,
              ...override,
            },
          });
          ids.push(event.id);
        }
        await check(new EventRepository(tx as unknown as PrismaService), ids);
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const search = (
    repository: EventRepository,
    filter: { search?: string; location?: string },
  ): Promise<string[]> =>
    repository
      .getUpcomingPublicEvents(
        NOW,
        { limit: 50, offset: 0 },
        { activityIds: [], ...filter },
      )
      .then((page) => page.items.map((item) => item.id));

  it('finds a part of the title, ignoring case and diacritics', async () => {
    await withEvents(
      [{ title: `${MARK} Čtvrteční FLORBAL` }],
      async (repository, [id]) => {
        expect(
          await search(repository, { search: `${MARK} ctvrtecni` }),
        ).toEqual([id]);
        expect(await search(repository, { search: 'florb' })).toContain(id);
        expect(await search(repository, { search: `${MARK} jiný` })).toEqual(
          [],
        );
      },
    );
  });

  it('finds the activity by its name', async () => {
    await withEvents([{}], async (repository, [id]) => {
      expect(await search(repository, { search: 'sachy' })).toContain(id);
    });
  });

  it('finds a place by city and district, partially', async () => {
    await withEvents(
      [{ locationCity: 'Brno', locationDistrict: 'Brno-Žabovřesky' }, {}],
      async (repository, [brno, praha]) => {
        const found = await search(repository, { location: 'zabov' });
        expect(found).toContain(brno);
        expect(found).not.toContain(praha);
      },
    );
  });

  it('never finds a private venue by its name', async () => {
    await withEvents(
      [
        {
          venueType: VenueType.PRIVATE_VENUE,
          locationPlaceName: `${MARK} U Nováků doma`,
        },
        { locationPlaceName: `${MARK} Sokolovna` },
      ],
      async (repository, [privateVenue, publicVenue]) => {
        const found = await search(repository, { location: `${MARK}` });
        expect(found).toContain(publicVenue);
        expect(found).not.toContain(privateVenue);
        expect(
          await search(repository, { search: 'novaku doma' }),
        ).not.toContain(privateVenue);
      },
    );
  });

  it('keeps hidden, unpublished and finished events out', async () => {
    await withEvents(
      [
        {},
        { isHidden: true },
        { status: EventStatus.DRAFT },
        {
          startAt: new Date('2020-01-01T18:00:00Z'),
          endAt: new Date('2020-01-01T20:00:00Z'),
        },
      ],
      async (repository, [visible, ...others]) => {
        const found = await search(repository, { search: MARK });
        expect(found).toEqual([visible]);
        expect(found).not.toEqual(expect.arrayContaining(others));
      },
    );
  });

  it('combines the text with the activity and reports the matching total', async () => {
    await withEvents([{}, {}], async (repository, [first, second]) => {
      const page = await repository.getUpcomingPublicEvents(
        NOW,
        { limit: 1, offset: 0 },
        { activityIds: [], search: MARK, location: 'prah' },
      );
      expect(page.total).toBe(2);
      expect(page.items.map((item) => item.id)).toEqual([first]);
      expect(second).toBeDefined();
    });
  });
});
