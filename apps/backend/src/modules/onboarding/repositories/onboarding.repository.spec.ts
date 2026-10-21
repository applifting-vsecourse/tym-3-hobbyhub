import { PrismaService } from '@/core/prisma/prisma.service';
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
  homeCity: null,
  homeStreet: null,
  declaredCity: 'Praha 8',
  declaredStreet: null,
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

  it('prefers a full home address over the typed city', async () => {
    const { repository } = setup(
      aUserRow({ homeCity: 'Brno', homeStreet: 'Cejl 1' }),
    );
    const onboarding = await repository.getOnboarding('u1');
    expect(onboarding?.city).toBe('Brno');
    expect(onboarding?.street).toBe('Cejl 1');
  });

  it('answers null for a user that does not exist', async () => {
    const { repository } = setup(null as unknown as Record<string, unknown>);
    expect(await repository.getOnboarding('nobody')).toBeNull();
  });
});
