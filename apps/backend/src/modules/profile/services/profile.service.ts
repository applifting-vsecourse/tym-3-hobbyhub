import {
  HomeAddress,
  InterestInput,
  TRAVEL_RADIUS_DEFAULT_KM,
} from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import {
  coverViolations,
  imageViolations,
  privateDetailsViolations,
  Profile,
  PublicProfile,
} from '@/modules/profile/domain/profile';
import {
  NicknameChange,
  ProfileRepository,
} from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  nicknameChangeableFrom,
  nicknameViolation,
} from '@/shared/auth/registration/nickname';
import { Gender } from '@/shared/auth/registration/registration';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly onboardingService: OnboardingService,
  ) {}

  async getProfile(user: Identity, now = new Date()): Promise<Profile> {
    const row = await this.profileRepository.getRow(user.id);
    if (!row) throw new NotFoundException('User not found');
    const onboarding = await this.onboardingService.getOnboarding(user);
    return {
      name: row.name,
      nicknameChangeableFrom: nicknameChangeableFrom(
        row.nicknameChangedAt,
        now,
      ),
      joinedAt: row.createdAt,
      bio: row.bio,
      image: row.image,
      cover: row.profileCover,
      gender: row.gender,
      birthYear: row.birthYear,
      interests: onboarding.interests,
      address: onboarding.address,
      travelRadiusKm: onboarding.travelRadiusKm,
    };
  }

  // F-04.2: another person's profile: only what the visibility matrix lets any
  // signed-in person see. The e-mail is never part of it.
  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const row = await this.profileRepository.getPublicRow(userId);
    if (!row) throw new NotFoundException('User not found');
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      image: row.image,
      cover: row.profileCover,
      interests: await this.onboardingService.getInterestsOf(userId),
    };
  }

  // Only what is sent is changed; `null` clears the bio or the photo. Nothing
  // is saved unless all of it passes.
  async updatePublic(
    user: Identity,
    data: {
      name?: string;
      bio?: string | null;
      image?: string | null;
      cover?: string | null;
    },
    now = new Date(),
  ): Promise<Profile> {
    const nickname =
      data.name === undefined
        ? undefined
        : await this.nicknameChange(user, data.name, now);
    if (data.image) {
      const violations = imageViolations(data.image);
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    if (data.cover) {
      const violations = coverViolations(data.cover);
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    const { bio, image, cover } = data;
    const result = await this.profileRepository.updatePublic(user.id, {
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image }),
      ...(nickname && { nickname }),
      ...(cover !== undefined && { profileCover: cover }),
    });
    // Someone took the same nickname between the check and the save.
    if (result === 'NICKNAME_TAKEN') {
      throw new BadRequestException(['NICKNAME_TAKEN']);
    }
    return this.getProfile(user, now);
  }

  /**
   * #212: checks a nickname sent with the profile. The same one as now is no
   * change (null); a new one must follow the rules, be free, and come at least
   * 30 days after the last change (ADR-0025).
   */
  private async nicknameChange(
    user: Identity,
    nickname: string,
    now: Date,
  ): Promise<NicknameChange | null> {
    const row = await this.profileRepository.getRow(user.id);
    if (!row) throw new NotFoundException('User not found');
    if (nickname === row.name) return null;

    const violation = nicknameViolation(nickname);
    if (violation) throw new BadRequestException([violation]);
    if (nicknameChangeableFrom(row.nicknameChangedAt, now)) {
      throw new BadRequestException(['NICKNAME_CHANGE_TOO_SOON']);
    }
    if (await this.profileRepository.isNicknameTaken(nickname, user.id)) {
      throw new BadRequestException(['NICKNAME_TAKEN']);
    }
    return { nickname, changedAt: now };
  }

  async updatePrivate(
    user: Identity,
    data: { gender: Gender; birthYear: number },
    now = new Date(),
  ): Promise<Profile> {
    const violations = privateDetailsViolations(
      data.gender,
      data.birthYear,
      now,
    );
    if (violations.length > 0) throw new BadRequestException(violations);
    await this.profileRepository.updatePrivate(user.id, {
      gender: data.gender,
      birthYear: data.birthYear,
    });
    return this.getProfile(user);
  }

  async updateActivities(
    user: Identity,
    items: readonly InterestInput[],
  ): Promise<Profile> {
    await this.onboardingService.replaceActivities(user, items);
    return this.getProfile(user);
  }

  // The travel radius is out of scope of the profile: it stays as it was, or
  // takes the default for a first address.
  async updateLocation(user: Identity, address: HomeAddress): Promise<Profile> {
    const { travelRadiusKm } = await this.onboardingService.getOnboarding(user);
    await this.onboardingService.replaceLocation(user, {
      address,
      travelRadiusKm: travelRadiusKm ?? TRAVEL_RADIUS_DEFAULT_KM,
    });
    return this.getProfile(user);
  }

  // #24: removes the home address, the temporary place and the travel radius in
  // one go.
  async removeLocation(user: Identity): Promise<Profile> {
    await this.profileRepository.clearLocation(user.id);
    return this.getProfile(user);
  }
}
