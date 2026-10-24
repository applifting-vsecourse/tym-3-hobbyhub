// The text search of the public list against a real PostgreSQL, because its
// diacritics folding and its rule "a private venue is never found" live in SQL.
// Like event-schema.spec.ts it only runs on request:
//   DB_TESTS=1 pnpm backend test event-list-search
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventStatus, Prisma, VenueType } from '@/generated/prisma/client';
import { EventListPage } from './domain/event';
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
  // `activity` picks one of the three activities created for the case; it is
  // also handed to `check`, to filter by.
  type EventOverride = Partial<Prisma.EventUncheckedCreateInput> & {
    activity?: 0 | 1 | 2;
  };
  const withEvents = async (
    overrides: EventOverride[],
    check: (
      repository: EventRepository,
      ids: string[],
      activityIds: string[],
    ) => Promise<void>,
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
        const activityIds: string[] = [];
        for (const [index, name] of ['Šachy', 'Tenis', 'Florbal'].entries()) {
          const activity = await tx.activity.create({
            data: {
              name: `${name} ${suffix}`,
              icon: `icon-${index}`,
              categoryId: category.id,
              defaultMinParticipants: 2,
              defaultMaxParticipants: 10,
            },
          });
          activityIds.push(activity.id);
        }
        const ids: string[] = [];
        for (const [index, { activity, ...override }] of overrides.entries()) {
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
              activityId: activityIds[activity ?? 0],
              organizerId: user.id,
              ...override,
            },
          });
          ids.push(event.id);
        }
        await check(
          new EventRepository(tx as unknown as PrismaService),
          ids,
          activityIds,
        );
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const search = (
    repository: EventRepository,
    filter: { search?: string; location?: string; activityIds?: string[] },
  ): Promise<string[]> =>
    repository
      .getUpcomingPublicEvents(
        NOW,
        { limit: 50, offset: 0 },
        { ...filter, activityIds: filter.activityIds ?? [] },
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

  it('needs every word to match, each in any field', async () => {
    await withEvents(
      [{ locationCity: 'Praha' }, { locationCity: 'Brno' }],
      async (repository, [praha, brno]) => {
        // "sachy" is the activity, "praha" the city: two different columns.
        const found = await search(repository, {
          search: `sachy ${MARK} praha`,
        });
        expect(found).toContain(praha);
        expect(found).not.toContain(brno);
        expect(
          await search(repository, { search: 'sachy zzzneexistuje' }),
        ).toEqual([]);
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

  it('combines the text and place with one or more activities', async () => {
    await withEvents(
      [
        { activity: 0, locationCity: 'Praha' },
        { activity: 1, locationCity: 'Praha' },
        { activity: 2, locationCity: 'Praha' },
        { activity: 0, locationCity: 'Brno' },
        { activity: 1, locationCity: 'Brno', title: 'Jiný název' },
      ],
      async (
        repository,
        [chess, tennis, floorball, chessBrno, other],
        [a, b],
      ) => {
        const text = { search: MARK };
        // One activity leaves out the others, in every city.
        expect(await search(repository, { ...text, activityIds: [a] })).toEqual(
          [chess, chessBrno],
        );
        // Several activities are alternatives.
        expect(
          await search(repository, { ...text, activityIds: [a, b] }),
        ).toEqual([chess, tennis, chessBrno]);
        // Together with the place.
        expect(
          await search(repository, {
            ...text,
            location: 'prah',
            activityIds: [a, b],
          }),
        ).toEqual([chess, tennis]);
        expect(
          await search(repository, {
            ...text,
            location: 'brn',
            activityIds: [b],
          }),
        ).toEqual([]);
        // Without the text only the activity and place decide; `other` has no MARK.
        expect(
          await search(repository, { location: 'brn', activityIds: [b] }),
        ).toEqual([other]);
        expect([floorball]).toHaveLength(1);
      },
    );
  });

  it('reports the total of the filtered list, not of the page', async () => {
    await withEvents(
      [{ activity: 0 }, { activity: 0 }, { activity: 1 }],
      async (repository, [first], [a]) => {
        const page = await repository.getUpcomingPublicEvents(
          NOW,
          { limit: 1, offset: 0 },
          { activityIds: [a], search: MARK, location: 'prah' },
        );
        expect(page.total).toBe(2);
        expect(page.items.map((item) => item.id)).toEqual([first]);
      },
    );
  });

  describe('saving the position of an event', () => {
    const create = async (
      repository: EventRepository,
      seed: { organizerId: string; activityId: string },
      position: { latitude?: number; longitude?: number },
    ): Promise<string> => {
      const event = await repository.createPublishedEvent({
        title: `${MARK} nová akce`,
        activityId: seed.activityId,
        description: 'Test',
        venueType: 'PUBLIC_VENUE',
        startAt: new Date('2030-02-01T18:00:00Z'),
        endAt: new Date('2030-02-01T20:00:00Z'),
        location: {
          street: 'Chabařovická 4',
          city: 'Praha',
          postalCode: '18200',
          country: 'Česko',
          ...position,
        },
        minParticipants: 2,
        maxParticipants: 4,
        externalOccupiedSpots: 0,
        approvalMode: 'MANUAL',
        organizerId: seed.organizerId,
        publishedAt: NOW,
      });
      return event.id;
    };

    it('stores the position of a picked address and reads it back', async () => {
      await withEvents([{}], async (repository, [existing], [activityId]) => {
        const organizerId = (await repository.getEventById(existing as string))
          ?.organizerId as string;
        const id = await create(
          repository,
          { organizerId, activityId: activityId as string },
          { latitude: 50.129712, longitude: 14.442123 },
        );

        const { location } = (await repository.getEventById(id)) ?? {};
        expect(location?.latitude).toBeCloseTo(50.129712, 6);
        expect(location?.longitude).toBeCloseTo(14.442123, 6);
        // And the event is found by distance from there.
        const page = await repository.getUpcomingPublicEvents(
          NOW,
          { limit: 50, offset: 0 },
          {
            activityIds: [],
            search: MARK,
            near: { latitude: 50.13, longitude: 14.44 },
          },
        );
        expect(
          page.items.find((item) => item.id === id)?.distanceKm,
        ).toBeLessThan(1);
      });
    });

    it('stores an address typed by hand without a position', async () => {
      await withEvents([{}], async (repository, [existing], [activityId]) => {
        const organizerId = (await repository.getEventById(existing as string))
          ?.organizerId as string;
        const id = await create(
          repository,
          { organizerId, activityId: activityId as string },
          {},
        );

        const { location } = (await repository.getEventById(id)) ?? {};
        expect(location?.latitude).toBeNull();
        expect(location?.longitude).toBeNull();
      });
    });
  });

  describe('sorted by distance', () => {
    // Staroměstské náměstí in Prague.
    const near = { latitude: 50.0875, longitude: 14.4213 };
    const nearest = (repository: EventRepository): Promise<EventListPage> =>
      repository.getUpcomingPublicEvents(
        NOW,
        { limit: 50, offset: 0 },
        { activityIds: [], search: MARK, near },
      );

    it('puts the nearest first and reports the distance', async () => {
      await withEvents(
        [
          // Brno, the earliest start.
          { locationLatitude: 49.1951, locationLongitude: 16.6068 },
          // Vinohrady, about 2 km away.
          { locationLatitude: 50.0755, locationLongitude: 14.4378 },
          // Plzeň.
          { locationLatitude: 49.7384, locationLongitude: 13.3736 },
        ],
        async (repository, [brno, vinohrady, plzen]) => {
          const page = await nearest(repository);
          expect(page.items.map((item) => item.id)).toEqual([
            vinohrady,
            plzen,
            brno,
          ]);
          const [first, second, third] = page.items.map(
            (item) => item.distanceKm ?? NaN,
          );
          expect(first).toBeGreaterThan(1.5);
          expect(first).toBeLessThan(2.5);
          expect(second).toBeGreaterThan(80);
          expect(second).toBeLessThan(100);
          expect(third).toBeGreaterThan(180);
          expect(third).toBeLessThan(195);
        },
      );
    });

    it('puts events without coordinates and private venues last, with no distance', async () => {
      await withEvents(
        [
          {},
          {
            venueType: VenueType.PRIVATE_VENUE,
            locationLatitude: 50.0875,
            locationLongitude: 14.4213,
          },
          { locationLatitude: 49.1951, locationLongitude: 16.6068 },
        ],
        async (repository, [noCoordinates, privateVenue, brno]) => {
          const page = await nearest(repository);
          expect(page.items.map((item) => item.id)).toEqual([
            brno,
            noCoordinates,
            privateVenue,
          ]);
          expect(page.items[1].distanceKm).toBeNull();
          expect(page.items[2].distanceKm).toBeNull();
          // A private venue is not put on a map either.
          expect(page.items[2].latitude).toBeNull();
          expect(page.items[2].longitude).toBeNull();
        },
      );
    });

    it('sends the coordinates of a public venue and no distance without a position', async () => {
      await withEvents(
        [{ locationLatitude: 50.0755, locationLongitude: 14.4378 }],
        async (repository) => {
          const page = await repository.getUpcomingPublicEvents(
            NOW,
            { limit: 50, offset: 0 },
            { activityIds: [], search: MARK },
          );
          expect(page.items[0].latitude).toBeCloseTo(50.0755, 4);
          expect(page.items[0].longitude).toBeCloseTo(14.4378, 4);
          expect(page.items[0].distanceKm).toBeNull();
        },
      );
    });
  });
});
