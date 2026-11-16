import { PrismaService } from '@/core/prisma/prisma.service';
import { Gender, Prisma } from '@/generated/prisma/client';
import { AdminUserListItem } from '@/modules/profile/domain/profile';
import {
  ADMIN_PAGE_SIZE,
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { normalizeNickname } from '@/shared/auth/registration/nickname';
import { Injectable } from '@nestjs/common';

export type ProfileRow = {
  name: string;
  nicknameChangedAt: Date | null;
  createdAt: Date;
  bio: string | null;
  image: string | null;
  profileCover: string | null;
  gender: Gender | null;
  birthYear: number | null;
};

export type PublicProfileRow = {
  id: string;
  name: string;
  bio: string | null;
  image: string | null;
  profileCover: string | null;
};

/** A new nickname as typed, and when the user changed it. */
export type NicknameChange = { nickname: string; changedAt: Date };

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

const accountSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  status: true,
  createdAt: true,
} as const;

// Trusts the layers above: it validates nothing, it only reads and writes.
@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRow(userId: string): Promise<ProfileRow | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        usernameChangedAt: true,
        createdAt: true,
        bio: true,
        image: true,
        profileCover: true,
        gender: true,
        birthYear: true,
      },
    });
    if (!row) return null;
    const { usernameChangedAt, ...rest } = row;
    return { ...rest, nicknameChangedAt: usernameChangedAt };
  }

  // #212: whether someone other than `userId` has the nickname, letter case
  // aside (the unique index compares the lower-cased form).
  async isNicknameTaken(nickname: string, userId: string): Promise<boolean> {
    const holder = await this.prisma.user.findUnique({
      where: { username: normalizeNickname(nickname) },
      select: { id: true },
    });
    return holder !== null && holder.id !== userId;
  }

  // Only the columns another person may see; the private ones are not selected.
  getPublicRow(userId: string): Promise<PublicProfileRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
        profileCover: true,
      },
    });
  }

  // A new nickname sets all three columns at once: the CHECKs keep `name` and
  // `displayUsername` equal and `username` their lower-cased form. Someone
  // taking the same nickname in the meantime trips the unique index; that is
  // answered, not thrown.
  async updatePublic(
    userId: string,
    data: {
      nickname?: NicknameChange;
      bio?: string | null;
      image?: string | null;
      profileCover?: string | null;
    },
  ): Promise<'UPDATED' | 'NICKNAME_TAKEN'> {
    const { nickname, ...rest } = data;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...rest,
          ...(nickname && {
            name: nickname.nickname,
            displayUsername: nickname.nickname,
            username: normalizeNickname(nickname.nickname),
            usernameChangedAt: nickname.changedAt,
          }),
          updatedAt: new Date(),
        },
      });
      return 'UPDATED';
    } catch (error) {
      if (nickname && isUniqueViolation(error)) return 'NICKNAME_TAKEN';
      throw error;
    }
  }

  async updatePrivate(
    userId: string,
    data: { gender: Gender; birthYear: number },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // #24: the whole location at once: the home address, the temporary place and
  // the travel radius. Nothing is kept as history.
  async clearLocation(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        homeStreet: null,
        homeCity: null,
        homePostalCode: null,
        homeCountry: null,
        homeDistrict: null,
        homePlaceName: null,
        homeLatitude: null,
        homeLongitude: null,
        temporaryStreet: null,
        temporaryCity: null,
        temporaryPostalCode: null,
        temporaryCountry: null,
        temporaryDistrict: null,
        temporaryPlaceName: null,
        temporaryLatitude: null,
        temporaryLongitude: null,
        temporaryLocationValidUntil: null,
        travelRadiusKm: null,
        updatedAt: new Date(),
      },
    });
  }

  // #238: every account for the administration, newest first, by name or
  // e-mail.
  async listForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<AdminUserListItem>> {
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: accountSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.offset,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  getAccount(userId: string): Promise<AdminUserListItem | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: accountSelect,
    });
  }
}
