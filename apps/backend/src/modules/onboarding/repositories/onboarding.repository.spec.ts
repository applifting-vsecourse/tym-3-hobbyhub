import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { OnboardingRepository } from './onboarding.repository';

const activity = {
  id: 'a1',
  name: 'Florbal',
  icon: 'florbal',
  defaultMinParticipants: 8,
  defaultMaxParticipants: 12,
};

const aUserRow = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: 'u1',
  onboardingStepsDone: 3,
  onboardingCompletedAt: new Date('2026-10-20T12:00:00Z'),
  homeStreet: 'Sokolovská 12',
  homeCity: 'Praha 8',
  homePostalCode: '186 00',
  homeCountry: 'Česko',
  homeLatitude: new Prisma.Decimal('50.0942'),
  homeLongitude: new Prisma.Decimal('14.4421'),
  travelRadiusKm: 25,
  bio: null,
  interests: [
    { activityId: 'a1', userId: 'u1', levelId: null, level: null, activity },
  ],
  ...overrides,
});

describe('OnboardingRepository', () => {
  const setup = (
    row: Record<string, unknown>,
  ): {
    prisma: DeepMockProxy<PrismaService>;
    repository: OnboardingRepository;
  } => {
    const prisma = mockDeep<PrismaService>();
    prisma.user.findUnique.mockResolvedValue(row as never);
    return { prisma, repository: new OnboardingRepository(prisma) };
  };

  it('asks to finish the profile only once the wizard ended without a set-up profile', async () => {
    const ended = setup(aUserRow({ interests: [] }));
    expect((await ended.repository.getOnboarding('u1'))?.skipped).toBe(true);

    const setUp = setup(aUserRow());
    expect((await setUp.repository.getOnboarding('u1'))?.skipped).toBe(false);

    const notEnded = setup(
      aUserRow({ onboardingCompletedAt: null, interests: [] }),
    );
    expect((await notEnded.repository.getOnboarding('u1'))?.skipped).toBe(
      false,
    );
  });

  it('reads the home address with its position', async () => {
    const { repository } = setup(aUserRow());
    const onboarding = await repository.getOnboarding('u1');
    expect(onboarding?.address).toEqual({
      street: 'Sokolovská 12',
      city: 'Praha 8',
      postalCode: '186 00',
      country: 'Česko',
      latitude: 50.0942,
      longitude: 14.4421,
    });
  });

  it('has no address while the home address is empty', async () => {
    const { repository } = setup(
      aUserRow({
        homeStreet: null,
        homeCity: null,
        homePostalCode: null,
        homeCountry: null,
        homeLatitude: null,
        homeLongitude: null,
      }),
    );
    expect((await repository.getOnboarding('u1'))?.address).toBeNull();
  });

  it('answers null for a user that does not exist', async () => {
    const { repository } = setup(null as unknown as Record<string, unknown>);
    expect(await repository.getOnboarding('nobody')).toBeNull();
  });
});
