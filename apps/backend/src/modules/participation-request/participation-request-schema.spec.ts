// Database constraints of a request to join (ADR-0003, ADR-0008). Like
// `event-schema.spec.ts`, they need a real PostgreSQL with the migrations
// applied, so the suite only runs on request:
//   DB_TESTS=1 pnpm backend test participation-request-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  RequestStatus,
  VenueType,
} from '@/generated/prisma/client';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

describeDb('participation request schema constraints', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const inRolledBackTransaction = async (
    work: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await work(tx);
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const random = (): string => Math.random().toString(36).slice(2);

  // An event and someone who is not its organizer.
  const eventAndApplicant = async (
    tx: Prisma.TransactionClient,
  ): Promise<{ eventId: string; userId: string }> => {
    const now = new Date();
    const [organizer, applicant] = await Promise.all(
      ['Organizátor', 'Žadatel'].map((name) =>
        tx.user.create({
          data: {
            id: `test-${random()}`,
            name,
            email: `test-${random()}@example.com`,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          },
        }),
      ),
    );
    const category = await tx.activityCategory.create({
      data: { name: `cat-${random()}` },
    });
    const activity = await tx.activity.create({
      data: {
        name: `act-${random()}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 10,
      },
    });
    const start = new Date('2030-01-01T18:00:00Z');
    const event = await tx.event.create({
      data: {
        title: 'Test',
        description: 'Test',
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 4,
        maxParticipants: 8,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId: activity.id,
        organizerId: organizer.id,
      },
    });
    return { eventId: event.id, userId: applicant.id };
  };

  it('accepts a pending request with and without a message', async () => {
    await inRolledBackTransaction(async (tx) => {
      const ids = await eventAndApplicant(tx);
      await tx.participationRequest.create({
        data: { ...ids, message: 'Hraju třetím rokem.' },
      });
      const other = await eventAndApplicant(tx);
      await tx.participationRequest.create({ data: other });
    });
  });

  it('rejects a second pending request of the same person', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const ids = await eventAndApplicant(tx);
        await tx.participationRequest.create({ data: ids });
        await tx.participationRequest.create({ data: ids });
      }),
    ).rejects.toThrow('Unique constraint');
  });

  it('accepts a new request after a withdrawn one', async () => {
    await inRolledBackTransaction(async (tx) => {
      const ids = await eventAndApplicant(tx);
      await tx.participationRequest.create({
        data: {
          ...ids,
          status: RequestStatus.WITHDRAWN,
          decidedAt: new Date(),
        },
      });
      await tx.participationRequest.create({ data: ids });
    });
  });

  it.each([
    ['participation_request_message_not_blank', { message: '   ' }],
    [
      'participation_request_decided_at_with_status',
      { decidedAt: new Date() },
    ],
    [
      'participation_request_decided_at_with_status',
      { status: RequestStatus.REJECTED },
    ],
  ])('rejects %s', async (constraint, override) => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const ids = await eventAndApplicant(tx);
        await tx.participationRequest.create({ data: { ...ids, ...override } });
      }),
    ).rejects.toThrow(constraint);
  });
});
