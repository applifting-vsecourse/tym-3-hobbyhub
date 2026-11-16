// The events a person organizes (F-06.3, #177) against a real PostgreSQL. Like the
// schema specs it only runs on request:
//   DB_TESTS=1 pnpm backend test event-organized
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

// ADR-0022: hidden means since when and why (CHECK event_hidden_all_or_nothing).
const HIDDEN = {
  isHidden: true,
  hiddenAt: new Date('2030-01-01T00:00:00Z'),
  hiddenReason: 'Skryto správcem v testu.',
} as const;

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('EventRepository: organized events', () => {
  const prisma = new PrismaService();
  const repository = new EventRepository(prisma);
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.activity.deleteMany({
      where: { categoryId: { in: created.categoryIds } },
    });
    await prisma.activityCategory.deleteMany({
      where: { id: { in: created.categoryIds } },
    });
    created.eventIds = [];
    created.userIds = [];
    created.categoryIds = [];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const random = (): string => Math.random().toString(36).slice(2);

  const aUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name: 'Test',
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.userIds.push(user.id);
    return user.id;
  };

  const anActivity = async (): Promise<string> => {
    const category = await prisma.activityCategory.create({
      data: {
        name: `cat-${random()}`,
        icon: `cat-${random()}`,
        order: Math.floor(Math.random() * 2_000_000_000),
      },
    });
    created.categoryIds.push(category.id);
    const activity = await prisma.activity.create({
      data: {
        name: `act-${random()}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 4,
      },
    });
    return activity.id;
  };

  const anEvent = async (
    organizerId: string,
    activityId: string,
    day: number,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const start = new Date(Date.UTC(2030, 0, day, 18));
    const event = await prisma.event.create({
      data: {
        title: `Test ${day}`,
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.MANUAL,
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 4,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId,
        organizerId,
        ...extra,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const page = { limit: 10, offset: 0 };
  // Days of December 2029, before `now`: events that are over.
  const past = (day: number): Record<string, Date> => {
    const start = new Date(Date.UTC(2029, 11, day, 18));
    return {
      startAt: start,
      endAt: new Date(start.getTime() + 2 * 3600 * 1000),
    };
  };
  const ids = (result: { items: { id: string }[] }): string[] =>
    result.items.map((item) => item.id);

  it('returns a page of own and co-organized events, soonest first', async () => {
    const [me, other] = [await aUser(), await aUser()];
    const activityId = await anActivity();
    const late = await anEvent(me, activityId, 20);
    const soon = await anEvent(other, activityId, 5, {
      coOrganizers: { connect: { id: me } },
    });
    await anEvent(other, activityId, 6);

    const all = await repository.getOrganizedBy(me, now, page);
    const second = await repository.getOrganizedBy(me, now, {
      limit: 1,
      offset: 1,
    });

    expect(all.total).toBe(2);
    expect(ids(all)).toEqual([soon, late]);
    expect(second.total).toBe(2);
    expect(ids(second)).toEqual([late]);
  });

  // #177: what is still on first, soonest first; then what is over, latest first.
  it('puts the events that are over after the ones still on, latest first', async () => {
    const me = await aUser();
    const activityId = await anActivity();
    const longAgo = await anEvent(me, activityId, 1, past(2));
    const late = await anEvent(me, activityId, 20);
    const yesterday = await anEvent(me, activityId, 1, past(30));
    const finished = await anEvent(me, activityId, 1, {
      ...past(20),
      status: EventStatus.FINISHED,
    });
    const soon = await anEvent(me, activityId, 5);

    const all = await repository.getOrganizedBy(me, now, page);

    expect(all.total).toBe(5);
    expect(ids(all)).toEqual([soon, late, yesterday, finished, longAgo]);
  });

  it('keeps the order across pages', async () => {
    const me = await aUser();
    const activityId = await anActivity();
    const expected = [
      await anEvent(me, activityId, 3),
      await anEvent(me, activityId, 9),
      await anEvent(me, activityId, 1, past(28)),
      await anEvent(me, activityId, 1, past(10)),
    ];

    const pages = await Promise.all(
      [0, 1, 2, 3].map((offset) =>
        repository.getOrganizedBy(me, now, { limit: 1, offset }),
      ),
    );

    expect(pages.flatMap(ids)).toEqual(expected);
  });

  it('narrows the events by the filter of the event list', async () => {
    const me = await aUser();
    const [florbal, chess] = [await anActivity(), await anActivity()];
    const match = await anEvent(me, florbal, 10, {
      title: 'Večerní florbal',
      locationCity: 'Brno',
    });
    await anEvent(me, chess, 10, { title: 'Večerní šachy' });
    await anEvent(me, florbal, 25, { title: 'Pozdní florbal' });
    await anEvent(me, florbal, 10, {
      title: 'Florbal v Praze',
      locationCity: 'Praha',
    });

    const result = await repository.getOrganizedBy(me, now, page, {
      activityIds: [florbal],
      search: 'vecerni',
      location: 'brno',
      dateFrom: '2030-01-05',
      dateTo: '2030-01-15',
    });

    expect(result.total).toBe(1);
    expect(ids(result)).toEqual([match]);
  });

  it.each([
    ['cancelled', { status: EventStatus.CANCELLED }],
    ['a draft', { status: EventStatus.DRAFT }],
    ['not public', { visibility: 'PRIVATE' }],
  ])('leaves out an event that is %s', async (_, extra) => {
    const me = await aUser();
    await anEvent(me, await anActivity(), 5, extra);

    const result = await repository.getOrganizedBy(me, now, page);

    expect(result).toEqual({ items: [], total: 0 });
  });

  // #239, ADR-0022: the organizer still has the event an administrator hid.
  it('keeps an event hidden by an administrator, marked as such', async () => {
    const me = await aUser();
    const hidden = await anEvent(me, await anActivity(), 5, HIDDEN);

    const result = await repository.getOrganizedBy(me, now, page);

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({ id: hidden, isHidden: true }),
    ]);
  });

  it('loads the cards of the given events and nothing for no ids', async () => {
    const me = await aUser();
    const id = await anEvent(me, await anActivity(), 5);

    const items = await repository.getListItemsByIds([id]);

    expect(items.map((item) => item.id)).toEqual([id]);
    await expect(repository.getListItemsByIds([])).resolves.toEqual([]);
  });
});
