// Taking a seat with automatic approval (F-05.5) and by the organizer's
// approval (F-05.7) against a real PostgreSQL, because what keeps two people
// off the last seat is a row lock. Like the schema specs it only runs on
// request:
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
  Prisma,
  VenueType,
} from '@/generated/prisma/client';
import { applicationStatusOf } from '@/modules/my-events/domain/my-events';
import { ParticipationRequestRepository } from './participation-request.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('ParticipationRequestRepository', () => {
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

  // An event with `freeSpots` seats left out of four, and `applicants` people
  // who do not organize it.
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

  describe('getApplicationFacts', () => {
    const before = new Date('2029-12-31T10:00:00Z');
    const page = { limit: 10, offset: 0 };
    const february = {
      startAt: new Date('2030-02-01T18:00:00Z'),
      endAt: new Date('2030-02-01T20:00:00Z'),
    };

    it('returns only the own seat and requests, soonest event first', async () => {
      const first = await eventWith(2, 2);
      const second = await eventWith(2, 2);
      const [me, other] = first.userIds as [string, string];
      await prisma.event.update({
        where: { id: second.eventId },
        data: february,
      });
      await prisma.participationRequest.createMany({
        data: [
          { eventId: first.eventId, userId: me },
          { eventId: first.eventId, userId: other },
          {
            eventId: second.eventId,
            userId: me,
            status: 'REJECTED',
            decidedAt: before,
          },
        ],
      });
      await prisma.participation.create({
        data: {
          eventId: second.eventId,
          userId: me,
          status: ParticipationStatus.CANCELLED,
        },
      });

      const result = await repository.getApplicationFacts(me, before, page);

      expect(result.total).toBe(2);
      expect(result.items).toEqual([
        {
          eventId: first.eventId,
          eventStatus: 'PUBLISHED',
          seat: null,
          requests: ['PENDING'],
        },
        {
          eventId: second.eventId,
          eventStatus: 'PUBLISHED',
          seat: 'CANCELLED',
          requests: ['REJECTED'],
        },
      ]);
    });

    it('pages the events and counts them all', async () => {
      const { eventId, userIds } = await eventWith(2, 1);
      const later = await eventWith(2, 0);
      const me = userIds[0]!;
      await prisma.event.update({
        where: { id: later.eventId },
        data: february,
      });
      await prisma.participationRequest.createMany({
        data: [
          { eventId, userId: me },
          { eventId: later.eventId, userId: me },
        ],
      });

      const result = await repository.getApplicationFacts(me, before, {
        limit: 1,
        offset: 1,
      });

      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.eventId)).toEqual([later.eventId]);
    });

    it.each([
      ['hidden', { isHidden: true }],
      ['not public', { visibility: 'PRIVATE' as const }],
      ['a draft', { status: 'DRAFT' as const }],
    ])('leaves out an event that is %s', async (_, change) => {
      const { eventId, userIds } = await eventWith(2, 1);
      await prisma.participationRequest.create({
        data: { eventId, userId: userIds[0]! },
      });
      await prisma.event.update({ where: { id: eventId }, data: change });

      const result = await repository.getApplicationFacts(
        userIds[0]!,
        before,
        page,
      );

      expect(result).toEqual({ items: [], total: 0 });
    });

    // #177: waiting and approved applications to events still on first,
    // soonest first; everything else after them, latest first.
    it('puts what is still on first and the rest after it, latest first', async () => {
      const {
        eventId: pendingSoon,
        userIds: [me],
      } = await eventWith(2, 1);
      const on = async (
        day: string,
        change: Prisma.EventUpdateInput = {},
      ): Promise<string> => {
        const { eventId } = await eventWith(2, 0);
        await prisma.event.update({
          where: { id: eventId },
          data: {
            startAt: new Date(`${day}T18:00:00Z`),
            endAt: new Date(`${day}T20:00:00Z`),
            ...change,
          },
        });
        return eventId;
      };
      const approvedLate = await on('2030-02-01');
      const approvedByRequest = await on('2030-03-01');
      const rejected = await on('2030-01-15');
      const withdrawn = await on('2030-01-20');
      const calledOff = await on('2030-01-10', { status: 'CANCELLED' });
      const seatGivenUp = await on('2030-01-05');
      const overApproved = await on('2029-12-20');
      const finished = await on('2029-12-25', { status: 'FINISHED' });
      const userId = me!;
      const decided = { decidedAt: before };
      await prisma.participationRequest.createMany({
        data: [
          { eventId: pendingSoon, userId },
          { eventId: approvedLate, userId, status: 'APPROVED', ...decided },
          {
            eventId: approvedByRequest,
            userId,
            status: 'APPROVED',
            ...decided,
          },
          { eventId: rejected, userId, status: 'REJECTED', ...decided },
          { eventId: withdrawn, userId, status: 'WITHDRAWN', ...decided },
          { eventId: calledOff, userId },
          { eventId: seatGivenUp, userId, status: 'APPROVED', ...decided },
          { eventId: overApproved, userId, status: 'APPROVED', ...decided },
        ],
      });
      await prisma.participation.createMany({
        data: [
          { eventId: approvedLate, userId, status: 'APPROVED' },
          { eventId: seatGivenUp, userId, status: 'CANCELLED' },
          { eventId: overApproved, userId, status: 'APPROVED' },
          { eventId: finished, userId, status: 'APPROVED' },
        ],
      });

      const result = await repository.getApplicationFacts(userId, before, {
        limit: 20,
        offset: 0,
      });

      expect(result.total).toBe(9);
      expect(
        result.items.map((item) => [item.eventId, applicationStatusOf(item)]),
      ).toEqual([
        [pendingSoon, 'PENDING'],
        [approvedLate, 'APPROVED'],
        [approvedByRequest, 'APPROVED'],
        [withdrawn, 'WITHDRAWN'],
        [rejected, 'REJECTED'],
        [calledOff, 'EVENT_CANCELLED'],
        [seatGivenUp, 'WITHDRAWN'],
        [finished, 'APPROVED'],
        [overApproved, 'APPROVED'],
      ]);
    });

    it('narrows the events by the filter of the event list', async () => {
      const {
        eventId: florbal,
        userIds: [me],
      } = await eventWith(2, 1);
      const { eventId: other } = await eventWith(2, 0);
      await prisma.event.update({
        where: { id: florbal },
        data: { title: 'Večerní florbal' },
      });
      await prisma.participationRequest.createMany({
        data: [
          { eventId: florbal, userId: me! },
          { eventId: other, userId: me! },
        ],
      });

      const result = await repository.getApplicationFacts(me!, before, page, {
        activityIds: [],
        search: 'VECERNI',
        location: 'praha',
        dateFrom: '2030-01-01',
        dateTo: '2030-01-01',
      });

      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.eventId)).toEqual([florbal]);
    });

    it('leaves out an event where the person only waits on the waitlist', async () => {
      const { eventId, userIds } = await eventWith(2, 1);
      await prisma.participation.create({
        data: {
          eventId,
          userId: userIds[0]!,
          status: ParticipationStatus.WAITLISTED,
          waitlistPosition: 1,
        },
      });

      const result = await repository.getApplicationFacts(
        userIds[0]!,
        before,
        page,
      );

      expect(result.total).toBe(0);
    });
  });

  describe('createPending', () => {
    it.each([
      ['cancelled', { status: 'CANCELLED' as const }, 'EVENT_CANCELLED'],
      [
        'started',
        { startAt: new Date('2029-12-31T09:00:00Z') },
        'EVENT_STARTED',
      ],
    ])(
      'refuses a request on an event that was %s after the service read it',
      async (_, change, violation) => {
        const { eventId, userIds } = await eventWith(2, 1);
        await prisma.event.update({ where: { id: eventId }, data: change });

        await expect(
          repository.createPending({ eventId, userId: userIds[0]!, at }),
        ).resolves.toBe(violation);
        await expect(
          prisma.participationRequest.count({ where: { eventId } }),
        ).resolves.toBe(0);
      },
    );
  });

  describe('createApproved', () => {
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

    it('refuses a seat on an event cancelled after the service read it', async () => {
      const { eventId, userIds } = await eventWith(2, 1);
      await prisma.event.update({
        where: { id: eventId },
        data: { status: 'CANCELLED' },
      });

      await expect(
        repository.createApproved({ eventId, userId: userIds[0]!, at }),
      ).resolves.toBe('EVENT_CANCELLED');
      await expect(
        prisma.participation.count({ where: { eventId } }),
      ).resolves.toBe(0);
    });

    it('gives the last seat to only one of two people taking it at once', async () => {
      const { eventId, userIds } = await eventWith(1, 2);

      const results = await Promise.all(
        userIds.map((userId) =>
          repository.createApproved({ eventId, userId, at }),
        ),
      );

      expect(results.filter((result) => result === 'EVENT_FULL')).toHaveLength(
        1,
      );
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

  describe('approvePending', () => {
    const pendingOf = async (
      eventId: string,
      userId: string,
    ): Promise<string> =>
      (
        await prisma.participationRequest.create({
          data: { eventId, userId, message: 'Ahoj' },
        })
      ).id;

    it('approves the waiting request and takes the seat', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      const requestId = await pendingOf(eventId, userId!);

      await expect(
        repository.approvePending({ eventId, requestId, at }),
      ).resolves.toMatchObject({
        id: requestId,
        status: 'APPROVED',
        message: 'Ahoj',
        decidedAt: at,
      });
      await expect(
        prisma.participation.findMany({
          where: { eventId },
          select: { userId: true, status: true },
        }),
      ).resolves.toEqual([{ userId, status: ParticipationStatus.APPROVED }]);
    });

    // #153: the organizer's words are kept with the approval, and read back.
    it('keeps the message of the approval', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      const requestId = await pendingOf(eventId, userId!);

      await expect(
        repository.approvePending({ eventId, requestId, message: 'Vítej', at }),
      ).resolves.toMatchObject({ decisionMessage: 'Vítej' });
      await expect(
        prisma.participationRequest.findUniqueOrThrow({
          where: { id: requestId },
        }),
      ).resolves.toMatchObject({ decisionMessage: 'Vítej' });
    });

    it('gives the last seat to only one of two requests approved at once', async () => {
      const { eventId, userIds } = await eventWith(1, 2);
      const requestIds = await Promise.all(
        userIds.map((userId) => pendingOf(eventId, userId)),
      );

      const results = await Promise.all(
        requestIds.map((requestId) =>
          repository.approvePending({ eventId, requestId, at }),
        ),
      );

      expect(results.filter((result) => result === 'EVENT_FULL')).toHaveLength(
        1,
      );
      await expect(
        prisma.participation.count({
          where: { eventId, status: ParticipationStatus.APPROVED },
        }),
      ).resolves.toBe(1);
      await expect(
        prisma.participationRequest.count({
          where: { eventId, status: 'PENDING' },
        }),
      ).resolves.toBe(1);
    });

    it('approves one request once when two organizers approve it at once', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(2, 1);
      const requestId = await pendingOf(eventId, userId!);

      const results = await Promise.all(
        [1, 2].map(() => repository.approvePending({ eventId, requestId, at })),
      );

      expect(results).toContain('NOT_PENDING');
      await expect(
        prisma.participation.count({ where: { eventId } }),
      ).resolves.toBe(1);
    });

    it('leaves a withdrawn request as it is', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      const requestId = await pendingOf(eventId, userId!);
      await repository.withdrawPending(eventId, userId!, at);

      await expect(
        repository.approvePending({ eventId, requestId, at }),
      ).resolves.toBe('NOT_PENDING');
      await expect(
        prisma.participation.count({ where: { eventId } }),
      ).resolves.toBe(0);
    });
  });

  // F-06.4, ADR-0017.
  describe('cancelSeat', () => {
    const message = 'Onemocněl jsem, promiňte.';

    it('gives the seat back with the message, and frees it', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      await repository.createApproved({ eventId, userId: userId!, at });

      await expect(
        repository.cancelSeat({ eventId, userId: userId!, message, at }),
      ).resolves.toBeNull();
      await expect(
        prisma.participation.findUniqueOrThrow({
          where: { eventId_userId: { eventId, userId: userId! } },
          select: {
            status: true,
            cancelledAt: true,
            cancellationMessage: true,
            isLateCancellation: true,
          },
        }),
      ).resolves.toEqual({
        status: ParticipationStatus.CANCELLED,
        cancelledAt: at,
        cancellationMessage: message,
        isLateCancellation: false,
      });
      await expect(repository.getSeatStatus(eventId, userId!)).resolves.toBe(
        'CANCELLED',
      );
      // The seat is free again: someone else can take it.
      await expect(
        repository.createApproved({ eventId, userId: userId!, at }),
      ).resolves.toMatchObject({ status: 'APPROVED' });
    });

    it('starts a seat taken again without the old message', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      await repository.createApproved({ eventId, userId: userId!, at });
      await repository.cancelSeat({ eventId, userId: userId!, message, at });
      await repository.createApproved({ eventId, userId: userId!, at });

      await expect(
        prisma.participation.findUniqueOrThrow({
          where: { eventId_userId: { eventId, userId: userId! } },
          select: {
            status: true,
            cancelledAt: true,
            cancellationMessage: true,
          },
        }),
      ).resolves.toEqual({
        status: ParticipationStatus.APPROVED,
        cancelledAt: null,
        cancellationMessage: null,
      });
    });

    it('finds no seat to give back, twice or never taken', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      await expect(
        repository.getSeatStatus(eventId, userId!),
      ).resolves.toBeNull();
      await expect(
        repository.cancelSeat({ eventId, userId: userId!, message, at }),
      ).resolves.toBe('NO_SEAT');

      await repository.createApproved({ eventId, userId: userId!, at });
      await repository.cancelSeat({ eventId, userId: userId!, message, at });
      await expect(
        repository.cancelSeat({ eventId, userId: userId!, message, at }),
      ).resolves.toBe('NO_SEAT');
    });

    it('keeps the seat of an event that started after the service read it', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      await repository.createApproved({ eventId, userId: userId!, at });
      await prisma.event.update({
        where: { id: eventId },
        data: { startAt: new Date('2029-12-31T09:00:00Z') },
      });

      await expect(
        repository.cancelSeat({ eventId, userId: userId!, message, at }),
      ).resolves.toBe('EVENT_STARTED');
      await expect(repository.getSeatStatus(eventId, userId!)).resolves.toBe(
        'APPROVED',
      );
    });
  });

  describe('rejectPending', () => {
    it('rejects the waiting request once, with the message', async () => {
      const {
        eventId,
        userIds: [userId],
      } = await eventWith(1, 1);
      const { id: requestId } = await prisma.participationRequest.create({
        data: { eventId, userId: userId! },
      });

      await expect(
        repository.rejectPending({ eventId, requestId, message: 'Plno', at }),
      ).resolves.toMatchObject({
        status: 'REJECTED',
        decidedAt: at,
        decisionMessage: 'Plno',
      });
      await expect(
        repository.rejectPending({ eventId, requestId, at }),
      ).resolves.toBeNull();
    });
  });

  describe('getParticipants', () => {
    const page = { limit: 20, offset: 0 };

    it('lists every seat, with the message of its request when there is one', async () => {
      const {
        eventId,
        userIds: [viaRequest, withoutRequest],
      } = await eventWith(4, 2);
      await prisma.participationRequest.create({
        data: {
          eventId,
          userId: viaRequest!,
          status: 'APPROVED',
          message: 'Beru hokejku',
          decidedAt: at,
        },
      });
      await prisma.participation.create({
        data: { eventId, userId: viaRequest!, status: 'APPROVED' },
      });
      await prisma.participation.create({
        data: { eventId, userId: withoutRequest!, status: 'APPROVED' },
      });

      const result = await repository.getParticipants(
        eventId,
        'APPROVED',
        page,
      );

      expect(result.total).toBe(2);
      expect(result.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'APPROVED',
            message: 'Beru hokejku',
            asksAgain: false,
          }),
          expect.objectContaining({ status: 'APPROVED', message: null }),
        ]),
      );
    });

    // F-06.4: a seat given back, with or without a request behind it.
    it('lists the people who gave their seat back, with their words', async () => {
      const {
        eventId,
        userIds: [quiet, asking, staying],
      } = await eventWith(4, 3);
      for (const userId of [quiet!, asking!, staying!]) {
        await repository.createApproved({ eventId, userId, at });
      }
      await repository.cancelSeat({
        eventId,
        userId: quiet!,
        message: 'Onemocněl jsem, promiňte.',
        at,
      });
      const later = new Date(at.getTime() + 60_000);
      await repository.cancelSeat({
        eventId,
        userId: asking!,
        message: 'Nakonec nemůžu, sorry.',
        at: later,
      });
      await prisma.participationRequest.create({
        data: { eventId, userId: asking!, message: 'Přece jen můžu' },
      });

      const result = await repository.getParticipants(
        eventId,
        'CANCELLED',
        page,
      );

      expect(result.total).toBe(2);
      expect(result.items).toEqual([
        expect.objectContaining({
          status: 'CANCELLED',
          message: 'Nakonec nemůžu, sorry.',
          changedAt: later,
          asksAgain: true,
        }),
        expect.objectContaining({
          status: 'CANCELLED',
          message: 'Onemocněl jsem, promiňte.',
          changedAt: at,
          asksAgain: false,
        }),
      ]);
      await expect(
        repository.getParticipants(eventId, 'APPROVED', page),
      ).resolves.toMatchObject({ total: 1 });
    });
  });

  describe('getDecidedRequests', () => {
    const page = { limit: 20, offset: 0 };
    const minutes = (n: number): Date => new Date(at.getTime() + n * 60_000);

    it('lists the rejected, latest first', async () => {
      const {
        eventId,
        userIds: [first, second],
      } = await eventWith(4, 2);
      await prisma.participationRequest.createMany({
        data: [
          {
            id: `test-${random()}`,
            eventId,
            userId: first!,
            status: 'REJECTED',
            decidedAt: minutes(1),
          },
          {
            id: `test-${random()}`,
            eventId,
            userId: second!,
            status: 'REJECTED',
            decidedAt: minutes(2),
          },
        ],
      });

      const result = await repository.getDecidedRequests(
        eventId,
        'REJECTED',
        page,
      );

      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.changedAt)).toEqual([
        minutes(2),
        minutes(1),
      ]);
    });

    it('lists a person who withdrew once, and not after they asked again', async () => {
      const {
        eventId,
        userIds: [twice, askedAgain],
      } = await eventWith(4, 2);
      const withdrawn = (
        userId: string,
        n: number,
      ): Prisma.ParticipationRequestCreateManyInput => ({
        id: `test-${random()}`,
        eventId,
        userId,
        status: 'WITHDRAWN' as const,
        decidedAt: minutes(n),
      });
      await prisma.participationRequest.createMany({
        data: [
          withdrawn(twice!, 1),
          withdrawn(twice!, 3),
          withdrawn(askedAgain!, 2),
          { id: `test-${random()}`, eventId, userId: askedAgain! },
        ],
      });

      const result = await repository.getDecidedRequests(
        eventId,
        'WITHDRAWN',
        page,
      );

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        status: 'WITHDRAWN',
        changedAt: minutes(3),
      });
    });
  });
});
