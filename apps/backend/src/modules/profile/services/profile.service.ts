import { FriendVisibility } from '@/modules/friendship/domain/friendship';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
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
import {
  NicknameChange,
  ProfileRepository,
  ProfileRow,
} from '@/modules/profile/repositories/profile.repository';
import { shownUserRatingScores } from '@/modules/rating/domain/rating';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import {
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { Identity } from '@/shared/auth/domain/identity';
import {
  nicknameChangeableFrom,
  nicknamePreviousChangeAtMost,
  nicknameViolation,
} from '@/shared/auth/registration/nickname';
import { Gender, Language } from '@/shared/auth/registration/registration';
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
    private readonly friendshipService: FriendshipService,
    private readonly blocks: UserBlockVisibility,
    private readonly ratingsService: RatingsService,
  ) {}

  async getProfile(user: Identity, now = new Date()): Promise<Profile> {
    return this.getProfileOf(user.id, now);
  }

  private async getProfileOf(
    userId: string,
    now = new Date(),
  ): Promise<Profile> {
    const row = await this.profileRepository.getRow(userId);
    if (!row) throw new NotFoundException('User not found');
    return this.profileFrom(row, userId, now);
  }

  private async profileFrom(
    row: ProfileRow,
    userId: string,
    now: Date,
  ): Promise<Profile> {
    const [onboarding, ratings] = await Promise.all([
      this.onboardingService.getOnboardingOf(userId),
      this.ratingsService.getUserScores(userId),
    ]);
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
      friendVisibility: {
        friendsSeeEventHistory: row.friendsSeeEventHistory,
        friendsSeeUpcomingEvents: row.friendsSeeUpcomingEvents,
      },
      ratings: shownUserRatingScores(ratings, true),
    };
  }

  // F-04.2: another person's profile: only what the visibility matrix lets any
  // signed-in person see. The e-mail is never part of it.
  // #239: the profile of someone blocked from the viewer does not exist.
  // #225: with the viewer's relation to the person (friends, a request either way).
  async getPublicProfile(
    userId: string,
    viewer: Identity,
  ): Promise<PublicProfile> {
    const hidden = await this.blocks.hiddenFor(viewer.id);
    const row = hidden.includes(userId)
      ? null
      : await this.profileRepository.getPublicRow(userId);
    if (!row) throw new NotFoundException('User not found');
    const [interests, relation, ratings] = await Promise.all([
      this.onboardingService.getInterestsOf(userId),
      this.friendshipService.relationBetween(viewer.id, userId),
      this.ratingsService.getUserScores(userId),
    ]);
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      image: row.image,
      cover: row.profileCover,
      interests,
      relation,
      // #236: someone opening their own public profile sees it as others do.
      ratings: shownUserRatingScores(ratings, false),
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
    // Someone took the same nickname, or another request changed it, between
    // the check and the save.
    if (typeof result === 'string') throw new BadRequestException([result]);
    return this.profileFrom(result, user.id, now);
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
    return {
      nickname,
      changedAt: now,
      previousChangeAtMost: nicknamePreviousChangeAtMost(now),
    };
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

  // #262: no rule beyond the DTO's: any of the app's languages, any time.
  async updateLanguage(user: Identity, language: Language): Promise<void> {
    await this.profileRepository.updateLanguage(user.id, language);
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
