// Who an edit or a cancellation of an event reaches (F-09.3, #59) against a
// real PostgreSQL. The notifications and their e-mails go to exactly these
// people, so a wrong row here is an e-mail to the wrong person, or none.
// Like the schema specs it only runs on request:
//   DB_TESTS=1 pnpm backend test event-audience
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  ParticipationStatus,
  RequestStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('EventRepository: the audience of an event', () => {
  const prisma = new PrismaService();
  const repository = new EventRepository(prisma);
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    categoryIds: [] as string[],
    reasonIds: [] as string[],
  };

  afterEach(async () => {
    // Seats and requests go with their event, the event before its reason.
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    await prisma.cancellationReason.deleteMany({
      where: { id: { in: created.reasonIds } },
    });
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
    created.reasonIds = [];
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
    return activity.id;
  };

  const anEvent = async (
    organizerId: string,
    activityId: string,
  ): Promise<string> => {
    const start = new Date(Date.UTC(2030, 0, 10, 18));
    const event = await prisma.event.create({
      data: {
        title: 'Test',
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.MANUAL,
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 8,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId,
        organizerId,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const aSeat = async (
    eventId: string,
    status: ParticipationStatus,
  ): Promise<string> => {
    const userId = await aUser();
    await prisma.participation.create({
      data: {
        eventId,
        userId,
        status,
        ...(status === ParticipationStatus.CANCELLED
          ? {
              cancelledAt: now,
              cancellationMessage: 'Onemocněl jsem, promiňte.',
            }
          : {}),
      },
    });
    return userId;
  };

  const aRequest = async (
    eventId: string,
    status: RequestStatus,
  ): Promise<string> => {
    const userId = await aUser();
    await prisma.participationRequest.create({
      data: {
        eventId,
        userId,
        status,
        requestedAt: now,
        // The database ties the decision time to every state but waiting.
        decidedAt: status === RequestStatus.PENDING ? null : now,
      },
    });
    return userId;
  };

  // One event with a person in every state, and someone else's event next
  // to it. Only the seat holder and the waiting applicant are its audience.
  const anEventWithEveryone = async (): Promise<{
    eventId: string;
    approved: string;
    pending: string;
  }> => {
    const [organizer, activityId] = [await aUser(), await anActivity()];
    const eventId = await anEvent(organizer, activityId);
    const approved = await aSeat(eventId, ParticipationStatus.APPROVED);
    // Gave the seat back (F-06.4): an edit is none of their business now.
    await aSeat(eventId, ParticipationStatus.CANCELLED);
    const pending = await aRequest(eventId, RequestStatus.PENDING);
    await aRequest(eventId, RequestStatus.REJECTED);
    await aRequest(eventId, RequestStatus.WITHDRAWN);
    // The same states on another event stay with that event.
    const other = await anEvent(organizer, activityId);
    await aSeat(other, ParticipationStatus.APPROVED);
    await aRequest(other, RequestStatus.PENDING);
    return { eventId, approved, pending };
  };

  it('is the approved participants and the waiting applicants, nobody else', async () => {
    const { eventId, approved, pending } = await anEventWithEveryone();

    await expect(repository.getEventAudience(eventId)).resolves.toEqual({
      participantIds: [approved],
      applicantIds: [pending],
    });
  });

  // EventsService.cancelEvent reads the audience after the cancellation is
  // saved. Should cancelling ever close the waiting requests, the applicants
  // would silently get no e-mail; this says so first.
  it('still holds the waiting applicants once the event is cancelled', async () => {
    const { eventId, approved, pending } = await anEventWithEveryone();
    const reason = await prisma.cancellationReason.create({
      data: { name: `reason-${random()}` },
    });
    created.reasonIds.push(reason.id);

    await expect(
      repository.cancelEvent(eventId, { cancellationReasonId: reason.id }, now),
    ).resolves.toMatchObject({ ok: true });

    await expect(repository.getEventAudience(eventId)).resolves.toEqual({
      participantIds: [approved],
      applicantIds: [pending],
    });
  });
});
