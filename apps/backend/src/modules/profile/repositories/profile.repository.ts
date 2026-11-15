import { PrismaService } from '@/core/prisma/prisma.service';
import { Gender } from '@/generated/prisma/client';
import { Injectable } from '@nestjs/common';

export type ProfileRow = {
  name: string;
  createdAt: Date;
  bio: string | null;
  image: string | null;
  profileCover: string | null;
  gender: Gender | null;
  birthYear: number | null;
  friendsSeeEventHistory: boolean;
  friendsSeeUpcomingEvents: boolean;
};

export type PublicProfileRow = {
  id: string;
  name: string;
  /** #225: the username as typed, else as stored. */
  nickname: string | null;
  bio: string | null;
  image: string | null;
  profileCover: string | null;
};

// Trusts the layers above: it validates nothing, it only reads and writes.
@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  getRow(userId: string): Promise<ProfileRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        createdAt: true,
        bio: true,
        image: true,
        profileCover: true,
        gender: true,
        birthYear: true,
        friendsSeeEventHistory: true,
        friendsSeeUpcomingEvents: true,
      },
    });
  }

  // Only the columns another person may see; the private ones are not selected.
  async getPublicRow(userId: string): Promise<PublicProfileRow | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        displayUsername: true,
        username: true,
        bio: true,
        image: true,
        profileCover: true,
      },
    });
    if (!row) return null;
    const { displayUsername, username, ...rest } = row;
    return { ...rest, nickname: displayUsername ?? username };
  }

  async updatePublic(
    userId: string,
    data: {
      name?: string;
      bio?: string | null;
      image?: string | null;
      profileCover?: string | null;
    },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // The private details and (#227) what friends may see of the user's
  // events: whatever of them is given, in one update.
  async updatePrivate(
    userId: string,
    data: {
      gender?: Gender;
      birthYear?: number;
      friendsSeeEventHistory?: boolean;
      friendsSeeUpcomingEvents?: boolean;
    },
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
}
