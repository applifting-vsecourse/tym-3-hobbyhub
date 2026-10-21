import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  Activity as PrismaActivity,
  User as PrismaUser,
  UserActivity as PrismaUserActivity,
} from '@/generated/prisma/client';
import {
  InterestInput,
  isProfileSetUp,
  Onboarding,
} from '@/modules/onboarding/domain/onboarding';
import { Injectable } from '@nestjs/common';

const include = {
  interests: {
    // A retired activity is no longer offered, so it is not shown or sent back.
    where: { activity: { isActive: true } },
    include: { activity: true },
    orderBy: { activity: { name: 'asc' } },
  },
} as const;

type UserRow = PrismaUser & {
  interests: (PrismaUserActivity & { activity: PrismaActivity })[];
};

const mapUserToOnboarding = (user: UserRow): Onboarding => {
  const interests = user.interests.map((interest) => ({
    level: interest.level,
    activity: {
      id: interest.activity.id,
      name: interest.activity.name,
      icon: interest.activity.icon,
      defaultMinParticipants: interest.activity.defaultMinParticipants,
      defaultMaxParticipants: interest.activity.defaultMaxParticipants,
    },
  }));
  // A full home address, once there is one, outranks what was typed here.
  const city = user.homeCity ?? user.declaredCity;
  return {
    stepsDone: user.onboardingStepsDone,
    // Worked out from what is saved now, so it stays right when the profile
    // changes after the wizard ended.
    skipped:
      user.onboardingCompletedAt !== null &&
      !isProfileSetUp({ interests, city }),
    completedAt: user.onboardingCompletedAt,
    interests,
    city,
    street: user.homeStreet ?? user.declaredStreet,
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
    data: { city: string; street: string | null; travelRadiusKm: number },
    step: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          declaredCity: data.city,
          declaredStreet: data.street,
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
