import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { LevelsService } from '@/modules/level/services/levels.service';
import {
  HomeAddress,
  Interest,
  InterestInput,
  interestViolations,
  Onboarding,
  ONBOARDING_STEP_COUNT,
  OnboardingStep,
  stepNumber,
} from '@/modules/onboarding/domain/onboarding';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import { imageViolations } from '@/modules/profile/domain/profile';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly activitiesService: ActivitiesService,
    private readonly levelsService: LevelsService,
  ) {}

  async getOnboarding(user: Identity): Promise<Onboarding> {
    return this.getOnboardingOf(user.id);
  }

  // #238: also for the administration, which reads anyone's profile.
  async getOnboardingOf(userId: string): Promise<Onboarding> {
    const onboarding = await this.onboardingRepository.getOnboarding(userId);
    if (!onboarding) throw new NotFoundException('User not found');
    return onboarding;
  }

  // What a person plays, for the profile others open (F-04.2).
  async getInterestsOf(userId: string): Promise<Interest[]> {
    const onboarding = await this.onboardingRepository.getOnboarding(userId);
    if (!onboarding) throw new NotFoundException('User not found');
    return onboarding.interests;
  }

  // Steps go in order: one can be saved or skipped only once the ones before
  // it are done or skipped (a step already done can be done again).
  private async assertReachable(
    user: Identity,
    step: OnboardingStep,
  ): Promise<void> {
    const { stepsDone } = await this.getOnboarding(user);
    if (stepNumber(step) > stepsDone + 1) {
      throw new BadRequestException('Finish or skip the earlier steps first');
    }
  }

  private async assertValidActivities(
    items: readonly InterestInput[],
  ): Promise<void> {
    const violations = interestViolations(items);
    if (violations.length > 0) {
      throw new BadRequestException(violations);
    }
    const ids = items.map((item) => item.activityId);
    if (!(await this.activitiesService.areAllAvailable(ids))) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    const levelIds = items.flatMap((item) =>
      item.levelId === null ? [] : [item.levelId],
    );
    if (!(await this.levelsService.areAllSkillLevels(levelIds))) {
      throw new BadRequestException('Level does not exist or is not offered');
    }
  }

  async saveActivities(
    user: Identity,
    items: readonly InterestInput[],
  ): Promise<Onboarding> {
    await this.assertValidActivities(items);
    await this.assertReachable(user, 'ACTIVITIES');
    await this.onboardingRepository.saveInterests(
      user.id,
      items,
      stepNumber('ACTIVITIES'),
    );
    return this.getOnboarding(user);
  }

  // The profile (F-04.1) edits the same answers at any time, so it does not
  // wait for the wizard's order and does not move its progress (step 0).
  async replaceActivities(
    user: Identity,
    items: readonly InterestInput[],
  ): Promise<Onboarding> {
    await this.assertValidActivities(items);
    await this.getOnboarding(user);
    await this.onboardingRepository.saveInterests(user.id, items, 0);
    return this.getOnboarding(user);
  }

  async replaceLocation(
    user: Identity,
    data: { address: HomeAddress; travelRadiusKm: number },
  ): Promise<Onboarding> {
    await this.getOnboarding(user);
    await this.onboardingRepository.saveLocation(user.id, data, 0);
    return this.getOnboarding(user);
  }

  async saveLocation(
    user: Identity,
    data: { address: HomeAddress; travelRadiusKm: number },
  ): Promise<Onboarding> {
    await this.assertReachable(user, 'LOCATION');
    await this.onboardingRepository.saveLocation(
      user.id,
      data,
      stepNumber('LOCATION'),
    );
    return this.getOnboarding(user);
  }

  async saveProfile(
    user: Identity,
    data: { bio: string | null; image?: string | null },
  ): Promise<Onboarding> {
    if (data.image) {
      const violations = imageViolations(data.image);
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    await this.assertReachable(user, 'PROFILE');
    await this.onboardingRepository.saveBio(
      user.id,
      data.bio,
      data.image,
      stepNumber('PROFILE'),
    );
    return this.getOnboarding(user);
  }

  async skipStep(user: Identity, step: OnboardingStep): Promise<Onboarding> {
    await this.assertReachable(user, step);
    await this.onboardingRepository.skipStep(user.id, stepNumber(step));
    return this.getOnboarding(user);
  }

  // The last step's "Dokončit": only once every step was saved or skipped.
  async finish(user: Identity, now = new Date()): Promise<Onboarding> {
    const { stepsDone } = await this.getOnboarding(user);
    if (stepsDone < ONBOARDING_STEP_COUNT) {
      throw new BadRequestException('Finish or skip every step first');
    }
    await this.onboardingRepository.complete(user.id, now);
    return this.getOnboarding(user);
  }

  // "Přeskočit vše": ends the wizard from any step, keeping what is saved.
  async skipAll(user: Identity, now = new Date()): Promise<Onboarding> {
    await this.getOnboarding(user);
    await this.onboardingRepository.complete(user.id, now);
    return this.getOnboarding(user);
  }
}
