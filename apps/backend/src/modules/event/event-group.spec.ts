// The events of a group (F-07.2) against a real PostgreSQL, because which
// events a group page shows is a Prisma `where`. Like the schema specs it only
// runs on request:
//   DB_TESTS=1 pnpm backend test event-group
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  EventVisibility,
  ParticipationStatus,
  RequestStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

type GroupFixture = {
  organizerId: string;
  activityId: string;
  groupId: string;
};

describeDb('EventRepository: group events', () => {
  const prisma = new PrismaService();
  const repository = new EventRepository(prisma);
  const now = new Date('2030-01-10T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    groupIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    await prisma.group.deleteMany({ where: { id: { in: created.groupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.activity.deleteMany({
      where: { categoryId: { in: created.categoryIds } },
    });
    await prisma.activityCategory.deleteMany({
      where: { id: { in: created.categoryIds } },
    });
    created.eventIds = [];
    created.userIds = [];
    created.groupIds = [];
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

  const aGroup = async (): Promise<GroupFixture> => {
    const organizerId = await aUser();
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
    const group = await prisma.group.create({
      data: {
        name: `group-${random()}`,
        description: 'Test',
        activityId: activity.id,
      },
    });
    created.groupIds.push(group.id);
    return { organizerId, activityId: activity.id, groupId: group.id };
  };

  const anEvent = async (
    { organizerId, activityId, groupId }: GroupFixture,
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
        groupId,
        ...extra,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const idsOf = async (
    groupId: string,
    period: 'upcoming' | 'past',
    visibilities: ('PUBLIC' | 'GROUP_ONLY')[],
  ): Promise<string[]> => {
    const page = await repository.getGroupEvents(
      groupId,
      { period, visibilities, now },
      { limit: 10, offset: 0 },
    );
    return page.items.map((event) => event.id);
  };

  it('lists the upcoming events soonest first, cancelled ones included', async () => {
    const group = await aGroup();
    const late = await anEvent(group, 20);
    const soon = await anEvent(group, 12, {
      visibility: EventVisibility.GROUP_ONLY,
    });
    const cancelled = await anEvent(group, 15, {
      status: EventStatus.CANCELLED,
    });

    await expect(
      idsOf(group.groupId, 'upcoming', ['PUBLIC', 'GROUP_ONLY']),
    ).resolves.toEqual([soon, cancelled, late]);
  });

  it('gives only the asked visibilities, never drafts, private or hidden ones', async () => {
    const group = await aGroup();
    const open = await anEvent(group, 12);
    await anEvent(group, 13, { visibility: EventVisibility.GROUP_ONLY });
    await anEvent(group, 14, { status: EventStatus.DRAFT });
    await anEvent(group, 15, { visibility: EventVisibility.PRIVATE });
    await anEvent(group, 16, { isHidden: true });
    const other = await aGroup();
    await anEvent(other, 12);

    await expect(idsOf(group.groupId, 'upcoming', ['PUBLIC'])).resolves.toEqual(
      [open],
    );
  });

  it('lists the past events newest first, with the total', async () => {
    const group = await aGroup();
    const older = await anEvent(group, 2);
    const newer = await anEvent(group, 8, { status: EventStatus.FINISHED });
    await anEvent(group, 12);

    const page = await repository.getGroupEvents(
      group.groupId,
      { period: 'past', visibilities: ['PUBLIC', 'GROUP_ONLY'], now },
      { limit: 1, offset: 0 },
    );

    expect(page.items.map((event) => event.id)).toEqual([newer]);
    expect(page.items[0]).toMatchObject({
      status: 'FINISHED',
      visibility: 'PUBLIC',
    });
    expect(page.total).toBe(2);
    await expect(idsOf(group.groupId, 'past', ['PUBLIC'])).resolves.toEqual([
      newer,
      older,
    ]);
  });

  it('knows who holds or awaits a seat', async () => {
    const group = await aGroup();
    const eventId = await anEvent(group, 12, {
      visibility: EventVisibility.GROUP_ONLY,
    });
    const seated = await aUser();
    const waiting = await aUser();
    const cancelled = await aUser();
    const stranger = await aUser();
    await prisma.participation.createMany({
      data: [
        { eventId, userId: seated, status: ParticipationStatus.APPROVED },
        { eventId, userId: cancelled, status: ParticipationStatus.CANCELLED },
      ],
    });
    await prisma.participationRequest.create({
      data: { eventId, userId: waiting, status: RequestStatus.PENDING },
    });

    await expect(repository.isInvolvedIn(eventId, seated)).resolves.toBe(true);
    await expect(repository.isInvolvedIn(eventId, waiting)).resolves.toBe(true);
    await expect(repository.isInvolvedIn(eventId, cancelled)).resolves.toBe(
      false,
    );
    await expect(repository.isInvolvedIn(eventId, stranger)).resolves.toBe(
      false,
    );
  });
});
