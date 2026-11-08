// The events a person organizes (F-06.3) against a real PostgreSQL. Like the
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

  it('returns a page of own and co-organized upcoming events, soonest first', async () => {
    const [me, other] = [await aUser(), await aUser()];
    const activityId = await anActivity();
    const late = await anEvent(me, activityId, 20);
    const soon = await anEvent(other, activityId, 5, {
      coOrganizers: { connect: { id: me } },
    });
    await anEvent(other, activityId, 6);

    const all = await repository.getUpcomingOrganizedBy(me, now, {
      limit: 10,
      offset: 0,
    });
    const second = await repository.getUpcomingOrganizedBy(me, now, {
      limit: 1,
      offset: 1,
    });

    expect(all.total).toBe(2);
    expect(all.items.map((item) => item.id)).toEqual([soon, late]);
    expect(second.total).toBe(2);
    expect(second.items.map((item) => item.id)).toEqual([late]);
  });

  it.each([
    ['cancelled', { status: EventStatus.CANCELLED }],
    ['a draft', { status: EventStatus.DRAFT }],
    ['hidden', { isHidden: true }],
    ['not public', { visibility: 'PRIVATE' }],
    [
      'over',
      {
        startAt: new Date('2029-12-29T10:00:00Z'),
        endAt: new Date('2029-12-30T10:00:00Z'),
      },
    ],
  ])('leaves out an event that is %s', async (_, extra) => {
    const me = await aUser();
    await anEvent(me, await anActivity(), 5, extra);

    const result = await repository.getUpcomingOrganizedBy(me, now, {
      limit: 10,
      offset: 0,
    });

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('loads the cards of the given events and nothing for no ids', async () => {
    const me = await aUser();
    const id = await anEvent(me, await anActivity(), 5);

    const items = await repository.getListItemsByIds([id]);

    expect(items.map((item) => item.id)).toEqual([id]);
    await expect(repository.getListItemsByIds([])).resolves.toEqual([]);
  });
});
