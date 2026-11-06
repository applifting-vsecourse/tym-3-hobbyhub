import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipationStatus } from '@/generated/prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ParticipationRequestRepository } from './participation-request.repository';

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
