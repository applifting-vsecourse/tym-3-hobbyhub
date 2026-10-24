// Taking a seat with automatic approval (F-05.5) against a real PostgreSQL,
// because what keeps two people off the last seat is a row lock. Like the
// schema specs it only runs on request:
//   DB_TESTS=1 pnpm backend test participation-request.repository
//
// Two transactions have to see each other's commits, so the cases write for
// real and delete what they created afterwards.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  ParticipationStatus,
  VenueType,
} from '@/generated/prisma/client';
import { ParticipationRequestRepository } from './participation-request.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('ParticipationRequestRepository.createApproved', () => {
  const prisma = new PrismaService();
  const repository = new ParticipationRequestRepository(prisma);
  const at = new Date('2029-12-31T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
    // The event first, its organizer cannot go while it exists; requests and
    // participations go with the event.
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

  // An event with automatic approval, `freeSpots` seats left out of four, and
  // `applicants` people who do not organize it.
  const eventWith = async (
    freeSpots: number,
    applicants: number,
  ): Promise<{ eventId: string; userIds: string[] }> => {
    const [organizerId, ...userIds] = await Promise.all(
      Array.from({ length: applicants + 1 }, async () => {
        const user = await prisma.user.create({
          data: {
            id: `test-${random()}`,
            name: 'Test',
            email: `test-${random()}@example.com`,
            emailVerified: true,
            createdAt: at,
            updatedAt: at,
          },
        });
        created.userIds.push(user.id);
        return user.id;
      }),
    );
    const category = await prisma.activityCategory.create({
      data: { name: `cat-${random()}` },
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
    const start = new Date('2030-01-01T18:00:00Z');
    const event = await prisma.event.create({
      data: {
        title: 'Test',
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.AUTOMATIC,
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 4,
        externalOccupiedSpots: 4 - freeSpots,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId: activity.id,
        organizerId: organizerId!,
      },
    });
    created.eventIds.push(event.id);
    return { eventId: event.id, userIds };
  };

  it('creates the approved request and the seat it takes', async () => {
    const {
      eventId,
      userIds: [userId],
    } = await eventWith(1, 1);

    await expect(
      repository.createApproved({
        eventId,
        userId: userId!,
        message: 'Ahoj',
        at,
      }),
    ).resolves.toMatchObject({
      status: 'APPROVED',
      message: 'Ahoj',
      requestedAt: at,
      decidedAt: at,
    });
    await expect(
      prisma.participation.findMany({
        where: { eventId },
        select: { userId: true, status: true },
      }),
    ).resolves.toEqual([{ userId, status: ParticipationStatus.APPROVED }]);
  });

  it('gives the last seat to only one of two people taking it at once', async () => {
    const { eventId, userIds } = await eventWith(1, 2);

    const results = await Promise.all(
      userIds.map((userId) =>
        repository.createApproved({ eventId, userId, at }),
      ),
    );

    expect(results.filter((result) => result === 'EVENT_FULL')).toHaveLength(1);
    await expect(
      prisma.participation.count({
        where: { eventId, status: ParticipationStatus.APPROVED },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.participationRequest.count({ where: { eventId } }),
    ).resolves.toBe(1);
  });

  it('gives one person one seat when two windows take it at once', async () => {
    const {
      eventId,
      userIds: [userId],
    } = await eventWith(2, 1);

    const results = await Promise.all(
      [1, 2].map(() =>
        repository.createApproved({ eventId, userId: userId!, at }),
      ),
    );

    expect(results).toContain('HAS_SEAT');
    await expect(
      prisma.participationRequest.count({ where: { eventId } }),
    ).resolves.toBe(1);
  });

  it('turns an earlier waitlisted row into the seat', async () => {
    const {
      eventId,
      userIds: [userId],
    } = await eventWith(1, 1);
    await prisma.participation.create({
      data: {
        eventId,
        userId: userId!,
        status: ParticipationStatus.WAITLISTED,
        waitlistPosition: 1,
      },
    });

    await expect(
      repository.createApproved({ eventId, userId: userId!, at }),
    ).resolves.toMatchObject({ status: 'APPROVED' });
    await expect(
      prisma.participation.findUniqueOrThrow({
        where: { eventId_userId: { eventId, userId: userId! } },
      }),
    ).resolves.toMatchObject({
      status: ParticipationStatus.APPROVED,
      waitlistPosition: null,
    });
  });
});
