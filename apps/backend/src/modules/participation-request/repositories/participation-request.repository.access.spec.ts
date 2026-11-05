import { PrismaService } from '@/core/prisma/prisma.service';
import { EventStatus, ParticipationStatus } from '@/generated/prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ParticipationRequestRepository } from './participation-request.repository';

describe('ParticipationRequestRepository.hasApprovedParticipant', () => {
  const setup = (
    found: { id: string } | null,
  ): {
    prisma: DeepMockProxy<PrismaService>;
    repository: ParticipationRequestRepository;
  } => {
    const prisma = mockDeep<PrismaService>();
    prisma.participation.findFirst.mockResolvedValue(found as never);
    return { prisma, repository: new ParticipationRequestRepository(prisma) };
  };

  it('asks for an seat on a published event (approved or attended) run by the organizer', async () => {
    const { prisma, repository } = setup({ id: 'r1' });
    await expect(repository.hasApprovedParticipant('org', 'u2')).resolves.toBe(
      true,
    );
    expect(prisma.participation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'u2',
          status: {
            in: [ParticipationStatus.APPROVED, ParticipationStatus.ATTENDED],
          },
          event: {
            status: EventStatus.PUBLISHED,
            OR: [
              { organizerId: 'org' },
              { coOrganizers: { some: { id: 'org' } } },
            ],
          },
        },
      }),
    );
  });

  it('is false when no such request exists', async () => {
    const { repository } = setup(null);
    await expect(repository.hasApprovedParticipant('org', 'u2')).resolves.toBe(
      false,
    );
  });
});

describe('ParticipationRequestRepository.getParticipants', () => {
  const user = {
    name: 'Honza',
    image: null,
    bio: 'Hraju',
    emailVerified: true,
    email: 'honza@example.com',
  };

  it('lists the people with a seat, oldest first, with only the applicant fields', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockResolvedValue([
      [{ id: 'p1', userId: 'u2', user }],
      1,
    ] as never);
    const repository = new ParticipationRequestRepository(prisma);

    const page = await repository.getParticipants('e1', {
      limit: 20,
      offset: 0,
    });

    expect(page).toEqual({
      items: [
        {
          userId: 'u2',
          applicant: {
            name: 'Honza',
            image: null,
            bio: 'Hraju',
            hasVerifiedEmail: true,
          },
        },
      ],
      total: 1,
    });
    expect(prisma.participation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: 'e1',
          status: {
            in: [ParticipationStatus.APPROVED, ParticipationStatus.ATTENDED],
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: 0,
        take: 20,
      }),
    );
  });
});
