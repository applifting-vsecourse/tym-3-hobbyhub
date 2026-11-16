import { FriendVisibility } from '@/modules/friendship/domain/friendship';
import {
  HomeAddress,
  InterestInput,
  TRAVEL_RADIUS_DEFAULT_KM,
} from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import {
  AdminUserDetail,
  AdminUserListItem,
  coverViolations,
  imageViolations,
  privateDetailsViolations,
  Profile,
  PublicProfile,
} from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import {
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { Identity } from '@/shared/auth/domain/identity';
import { Gender } from '@/shared/auth/registration/registration';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
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
    private readonly blocks: UserBlockVisibility,
  ) {}

  async getProfile(user: Identity): Promise<Profile> {
    return this.getProfileOf(user.id);
  }

  private async getProfileOf(userId: string): Promise<Profile> {
    const row = await this.profileRepository.getRow(userId);
    if (!row) throw new NotFoundException('User not found');
    const onboarding = await this.onboardingService.getOnboardingOf(userId);
    return {
      name: row.name,
      joinedAt: row.createdAt,
      bio: row.bio,
      image: row.image,
      cover: row.profileCover,
      gender: row.gender,
      birthYear: row.birthYear,
      interests: onboarding.interests,
      address: onboarding.address,
      travelRadiusKm: onboarding.travelRadiusKm,
      friendVisibility: {
        friendsSeeEventHistory: row.friendsSeeEventHistory,
        friendsSeeUpcomingEvents: row.friendsSeeUpcomingEvents,
      },
    };
  }

  // F-04.2: another person's profile: only what the visibility matrix lets any
  // signed-in person see. The e-mail is never part of it.
  // #239: the profile of someone blocked from the viewer does not exist.
  async getPublicProfile(
    userId: string,
    viewer: Identity,
  ): Promise<PublicProfile> {
    const hidden = await this.blocks.hiddenFor(viewer.id);
    const row = hidden.includes(userId)
      ? null
      : await this.profileRepository.getPublicRow(userId);
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

  // Only what is sent is changed; `null` clears the bio or the photo.
  async updatePublic(
    user: Identity,
    data: {
      name?: string;
      bio?: string | null;
      image?: string | null;
      cover?: string | null;
    },
  ): Promise<Profile> {
    if (data.image) {
      const violations = imageViolations(data.image);
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    if (data.cover) {
      const violations = coverViolations(data.cover);
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    const { cover, ...rest } = data;
    await this.profileRepository.updatePublic(user.id, {
      ...rest,
      ...(cover !== undefined && { profileCover: cover }),
    });
    return this.getProfile(user);
  }

  // The private details and (#227) what friends see, whichever of the two
  // came, in one write: the edit form never saves only half of them. The
  // switches only take effect for friends (#226).
  async updatePrivate(
    user: Identity,
    data: {
      details?: { gender: Gender; birthYear: number };
      friendVisibility?: FriendVisibility;
    },
    now = new Date(),
  ): Promise<Profile> {
    if (data.details) {
      const violations = privateDetailsViolations(
        data.details.gender,
        data.details.birthYear,
        now,
      );
      if (violations.length > 0) throw new BadRequestException(violations);
    }
    if (data.details || data.friendVisibility) {
      await this.profileRepository.updatePrivate(user.id, {
        ...data.details,
        ...data.friendVisibility,
      });
    }
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

  // #238: everyone, for the administration (visibility matrix: Superadmin).
  listUsersForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<AdminUserListItem>> {
    return this.profileRepository.listForAdministration(query);
  }

  // The account and the whole profile, private fields included.
  async getUserForAdministration(userId: string): Promise<AdminUserDetail> {
    const account = await this.profileRepository.getAccount(userId);
    if (!account) throw new NotFoundException('User not found');
    return { account, profile: await this.getProfileOf(userId) };
  }
}
