import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Activity as PrismaActivity,
  Level as PrismaLevel,
  User as PrismaUser,
  UserActivity as PrismaUserActivity,
} from '@/generated/prisma/client';
import {
  HomeAddress,
  InterestInput,
  isProfileSetUp,
  Onboarding,
} from '@/modules/onboarding/domain/onboarding';
import { Injectable } from '@nestjs/common';

const include = {
  interests: {
    // A retired activity is no longer offered, so it is not shown or sent back.
    where: { activity: { isActive: true } },
    include: { activity: true, level: true },
    orderBy: { activity: { name: 'asc' } },
  },
} as const;

type UserRow = PrismaUser & {
  interests: (PrismaUserActivity & {
    activity: PrismaActivity;
    level: PrismaLevel | null;
  })[];
};

// All or nothing, as the database demands; the position is stored as decimals.
const mapHomeAddress = (user: PrismaUser): HomeAddress | null =>
  user.homeStreet !== null &&
  user.homeCity !== null &&
  user.homePostalCode !== null &&
  user.homeCountry !== null &&
  user.homeLatitude !== null &&
  user.homeLongitude !== null
    ? {
        street: user.homeStreet,
        city: user.homeCity,
        postalCode: user.homePostalCode,
        country: user.homeCountry,
        latitude: user.homeLatitude.toNumber(),
        longitude: user.homeLongitude.toNumber(),
      }
    : null;

const mapUserToOnboarding = (user: UserRow): Onboarding => {
  const interests = user.interests.map((interest) => ({
    level: interest.level
      ? { id: interest.level.id, name: interest.level.name }
      : null,
    activity: {
      id: interest.activity.id,
      name: interest.activity.name,
      icon: interest.activity.icon,
      defaultMinParticipants: interest.activity.defaultMinParticipants,
      defaultMaxParticipants: interest.activity.defaultMaxParticipants,
    },
  }));
  const address = mapHomeAddress(user);
  return {
    stepsDone: user.onboardingStepsDone,
    // Worked out from what is saved now, so it stays right when the profile
    // changes after the wizard ended.
    skipped:
      user.onboardingCompletedAt !== null &&
      !isProfileSetUp({ interests, address }),
    completedAt: user.onboardingCompletedAt,
    interests,
    address,
    travelRadiusKm: user.travelRadiusKm,
    bio: user.bio,
  };
};

// Trusts the layers above: it validates nothing, it only reads and writes.
@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOnboarding(userId: string): Promise<Onboarding | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include,
    });
    return user ? mapUserToOnboarding(user) : null;
  }

  // Progress only ever moves forward, and the comparison is made by the
  // database, so two requests at once cannot take it back.
  private advanceTo(
    tx: Prisma.TransactionClient,
    userId: string,
    step: number,
  ): Prisma.PrismaPromise<Prisma.BatchPayload> {
    return tx.user.updateMany({
      where: { id: userId, onboardingStepsDone: { lt: step } },
      data: { onboardingStepsDone: step },
    });
  }

  async saveInterests(
    userId: string,
    items: readonly InterestInput[],
    step: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Two saves at once would both insert the same keys; the second waits
      // here for the first and then replaces its rows.
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`;
      await tx.userActivity.deleteMany({ where: { userId } });
      await tx.userActivity.createMany({
        data: items.map((item) => ({ userId, ...item })),
      });
      await this.advanceTo(tx, userId, step);
    });
  }

  async saveLocation(
    userId: string,
    data: { address: HomeAddress; travelRadiusKm: number },
    step: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          homeStreet: data.address.street,
          homeCity: data.address.city,
          homePostalCode: data.address.postalCode,
          homeCountry: data.address.country,
          homeLatitude: data.address.latitude,
          homeLongitude: data.address.longitude,
          // A district or place name of an address saved before would not
          // belong to this one.
          homeDistrict: null,
          homePlaceName: null,
          travelRadiusKm: data.travelRadiusKm,
        },
      });
      await this.advanceTo(tx, userId, step);
    });
  }

  async saveBio(
    userId: string,
    bio: string | null,
    step: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { bio } });
      await this.advanceTo(tx, userId, step);
    });
  }

  async skipStep(userId: string, step: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.advanceTo(tx, userId, step);
    });
  }

  // The first time the wizard ended stays the time it ended: ending it again
  // changes nothing.
  async complete(userId: string, now: Date): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: now },
    });
  }
}
