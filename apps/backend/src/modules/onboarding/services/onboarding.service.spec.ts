import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { LevelsService } from '@/modules/level/services/levels.service';
import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { OnboardingService } from './onboarding.service';

const user = new Identity('u1', 'jana@example.com', 'Jana', 'user');

const anOnboarding = (overrides: Partial<Onboarding> = {}): Onboarding => ({
  stepsDone: 0,
  skipped: false,
  completedAt: null,
  interests: [],
  city: null,
  street: null,
  travelRadiusKm: null,
  bio: null,
  ...overrides,
});

describe('OnboardingService', () => {
  const setup = (
    state: Onboarding | null = anOnboarding(),
    isActivityAvailable = true,
    areLevelsValid = true,
  ): {
    repository: MockProxy<OnboardingRepository>;
    service: OnboardingService;
  } => {
    const repository = mock<OnboardingRepository>();
    repository.getOnboarding.mockResolvedValue(state);
    const activities = mock<ActivitiesService>();
    activities.areAllAvailable.mockResolvedValue(isActivityAvailable);
    const levels = mock<LevelsService>();
    levels.areAllSkillLevels.mockResolvedValue(areLevelsValid);
    return {
      repository,
      service: new OnboardingService(repository, activities, levels),
    };
  };

  it('answers 404 for a user that does not exist', async () => {
    const { service } = setup(null);
    await expect(service.getOnboarding(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('saveActivities', () => {
    const items = [{ activityId: 'a1', levelId: 'l3' }];

    it('saves the activities for the signed-in user and counts step 1 done', async () => {
      const { repository, service } = setup();
      await service.saveActivities(user, items);
      expect(repository.saveInterests).toHaveBeenCalledWith('u1', items, 1);
    });

    it('refuses an empty selection', async () => {
      const { repository, service } = setup();
      await expect(service.saveActivities(user, [])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.saveInterests).not.toHaveBeenCalled();
    });

    it('refuses a level that a person cannot name', async () => {
      const { repository, service } = setup(anOnboarding(), true, false);
      await expect(service.saveActivities(user, items)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.saveInterests).not.toHaveBeenCalled();
    });

    it('refuses an activity that is no longer offered', async () => {
      const { repository, service } = setup(anOnboarding(), false);
      await expect(service.saveActivities(user, items)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.saveInterests).not.toHaveBeenCalled();
    });
  });

  it('saves the location and counts step 2 done', async () => {
    const { repository, service } = setup(anOnboarding({ stepsDone: 1 }));
    const data = { city: 'Praha 8', street: null, travelRadiusKm: 25 };
    await service.saveLocation(user, data);
    expect(repository.saveLocation).toHaveBeenCalledWith('u1', data, 2);
  });

  it('saves the bio and counts step 3 done', async () => {
    const { repository, service } = setup(anOnboarding({ stepsDone: 2 }));
    await service.saveProfile(user, { bio: 'Hraju rok.' });
    expect(repository.saveBio).toHaveBeenCalledWith('u1', 'Hraju rok.', 3);
  });

  describe('skipStep', () => {
    it('counts the step done', async () => {
      const { repository, service } = setup(anOnboarding({ stepsDone: 1 }));
      await service.skipStep(user, 'LOCATION');
      expect(repository.skipStep).toHaveBeenCalledWith('u1', 2);
    });

    it('refuses to skip ahead of the steps before it', async () => {
      const { repository, service } = setup(anOnboarding({ stepsDone: 0 }));
      await expect(service.skipStep(user, 'PROFILE')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.skipStep).not.toHaveBeenCalled();
    });
  });

  describe('steps in order', () => {
    it.each([
      [
        'location',
        (service: OnboardingService): Promise<Onboarding> =>
          service.saveLocation(user, {
            city: 'Praha',
            street: null,
            travelRadiusKm: 25,
          }),
      ],
      [
        'profile',
        (service: OnboardingService): Promise<Onboarding> =>
          service.saveProfile(user, { bio: 'Hraju rok' }),
      ],
    ])(
      'refuses to save the %s step before the ones ahead of it',
      async (_name, save) => {
        const { repository, service } = setup(anOnboarding({ stepsDone: 0 }));
        await expect(save(service)).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.saveLocation).not.toHaveBeenCalled();
        expect(repository.saveBio).not.toHaveBeenCalled();
      },
    );

    it('lets a step that is already done be saved again', async () => {
      const { repository, service } = setup(anOnboarding({ stepsDone: 3 }));
      await service.saveProfile(user, { bio: 'Nové bio' });
      expect(repository.saveBio).toHaveBeenCalledWith('u1', 'Nové bio', 3);
    });
  });

  describe('finish', () => {
    const now = new Date('2026-10-20T12:00:00Z');

    it('ends the wizard once every step is done or skipped', async () => {
      const { repository, service } = setup(anOnboarding({ stepsDone: 3 }));
      await service.finish(user, now);
      expect(repository.complete).toHaveBeenCalledWith('u1', now);
    });

    it('refuses while a step is still open', async () => {
      const { repository, service } = setup(anOnboarding({ stepsDone: 2 }));
      await expect(service.finish(user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.complete).not.toHaveBeenCalled();
    });
  });

  it('skipping everything ends the wizard from any step', async () => {
    const { repository, service } = setup(anOnboarding({ stepsDone: 0 }));
    const now = new Date('2026-10-20T12:00:00Z');
    await service.skipAll(user, now);
    expect(repository.complete).toHaveBeenCalledWith('u1', now);
  });
});
