import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  InterestInput,
  interestViolations,
  isProfileSetUp,
  Onboarding,
  ONBOARDING_STEP_COUNT,
  OnboardingStep,
  stepNumber,
} from '@/modules/onboarding/domain/onboarding';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
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
  ) {}

  async getOnboarding(user: Identity): Promise<Onboarding> {
    const onboarding = await this.onboardingRepository.getOnboarding(user.id);
    if (!onboarding) throw new NotFoundException('User not found');
    return onboarding;
  }

  async saveActivities(
    user: Identity,
    items: readonly InterestInput[],
  ): Promise<Onboarding> {
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
    await this.onboardingRepository.saveInterests(
      user.id,
      items,
      stepNumber('ACTIVITIES'),
    );
    return this.getOnboarding(user);
  }

  async saveLocation(
    user: Identity,
    data: { city: string; street: string | null; travelRadiusKm: number },
  ): Promise<Onboarding> {
    await this.onboardingRepository.saveLocation(
      user.id,
      data,
      stepNumber('LOCATION'),
    );
    return this.getOnboarding(user);
  }

  async saveProfile(
    user: Identity,
    data: { bio: string | null },
  ): Promise<Onboarding> {
    await this.onboardingRepository.saveBio(
      user.id,
      data.bio,
      stepNumber('PROFILE'),
    );
    return this.getOnboarding(user);
  }

  // Steps are passed in order: a step can be skipped only once the ones before
  // it are done or skipped.
  async skipStep(user: Identity, step: OnboardingStep): Promise<Onboarding> {
    const { stepsDone } = await this.getOnboarding(user);
    if (stepNumber(step) > stepsDone + 1) {
      throw new BadRequestException('Finish or skip the earlier steps first');
    }
    await this.onboardingRepository.skipStep(user.id, stepNumber(step));
    return this.getOnboarding(user);
  }

  // The last step's "Dokončit": only once every step was saved or skipped. The
  // profile prompt stays while the activities or the location are missing.
  async finish(user: Identity, now = new Date()): Promise<Onboarding> {
    const onboarding = await this.getOnboarding(user);
    if (onboarding.stepsDone < ONBOARDING_STEP_COUNT) {
      throw new BadRequestException('Finish or skip every step first');
    }
    await this.onboardingRepository.complete(
      user.id,
      { skipped: !isProfileSetUp(onboarding) },
      now,
    );
    return this.getOnboarding(user);
  }

  // "Přeskočit vše": ends the wizard from any step, keeping what is saved.
  async skipAll(user: Identity, now = new Date()): Promise<Onboarding> {
    const onboarding = await this.getOnboarding(user);
    await this.onboardingRepository.complete(
      user.id,
      { skipped: !isProfileSetUp(onboarding) },
      now,
    );
    return this.getOnboarding(user);
  }
}
