// #238: the administration sees every event, drafts and hidden ones too
// (visibility matrix: Superadmin). Against a real PostgreSQL, on request:
//   DB_TESTS=1 pnpm backend test event-administration
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  ParticipationStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('EventRepository: administration', () => {
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

  it('lists drafts, hidden and group-only events, found by title', async () => {
    const organizer = await aUser();
    const activityId = await anActivity();
    const tag = random();
    const draft = await anEvent(organizer, activityId, 1, {
      title: `Koncept ${tag}`,
      status: EventStatus.DRAFT,
    });
    const hidden = await anEvent(organizer, activityId, 2, {
      title: `Skrytá ${tag}`,
      isHidden: true,
    });
    const groupOnly = await anEvent(organizer, activityId, 3, {
      title: `Pro skupinu ${tag.toUpperCase()}`,
      visibility: 'GROUP_ONLY',
    });

    const page = await repository.listForAdministration({
      search: tag,
      offset: 0,
    });

    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.id).sort()).toEqual(
      [draft, hidden, groupOnly].sort(),
    );
    expect(page.items.find((item) => item.id === hidden)).toMatchObject({
      isHidden: true,
      organizer: { id: organizer },
    });
  });

  it('gives the detail of a hidden event with its participants', async () => {
    const [organizer, participant] = [await aUser(), await aUser()];
    const eventId = await anEvent(organizer, await anActivity(), 4, {
      isHidden: true,
      contact: '+420 777 000 000',
      participations: {
        create: { userId: participant, status: ParticipationStatus.APPROVED },
      },
    });

    const detail = await repository.getAdministrationDetail(eventId);

    expect(detail).toMatchObject({
      isHidden: true,
      organizer: { id: organizer },
      event: { contact: '+420 777 000 000', location: { street: 'Ulice 1' } },
      participants: [{ userId: participant, status: 'APPROVED' }],
    });
  });

  it('lists what a person organizes and where they hold a seat', async () => {
    const [person, other] = [await aUser(), await aUser()];
    const activityId = await anActivity();
    const own = await anEvent(person, activityId, 5);
    const coOrganized = await anEvent(other, activityId, 6, {
      coOrganizers: { connect: { id: person } },
    });
    const joined = await anEvent(other, activityId, 7, {
      participations: {
        create: {
          userId: person,
          status: ParticipationStatus.WAITLISTED,
          waitlistPosition: 1,
        },
      },
    });

    const events = await repository.getUserEventsForAdministration(person);

    expect(events.organized.map((item) => item.id).sort()).toEqual(
      [own, coOrganized].sort(),
    );
    expect(events.participations).toEqual([
      expect.objectContaining({
        id: joined,
        participationStatus: 'WAITLISTED',
      }),
    ]);
  });
});
