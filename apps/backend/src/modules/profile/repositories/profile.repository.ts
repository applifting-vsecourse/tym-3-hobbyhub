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
};

export type PublicProfileRow = {
  id: string;
  name: string;
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
      },
    });
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

  async updatePrivate(
    userId: string,
    data: { gender: Gender; birthYear: number },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { ...data, updatedAt: new Date() },
    });
  }
}
