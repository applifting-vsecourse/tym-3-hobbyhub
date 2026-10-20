import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  GroupVisibility,
  Prisma,
  Activity as PrismaActivity,
  Group as PrismaGroup,
} from '@/generated/prisma/client';
import {
  CreateGroupData,
  Group,
  GroupPage,
  MyGroup,
} from '@/modules/group/domain/group';
import { Injectable } from '@nestjs/common';

const include = {
  activity: true,
  _count: { select: { memberships: true } },
} as const;

const mapPrismaGroupToDomain = (
  group: PrismaGroup & {
    activity: PrismaActivity;
    _count: { memberships: number };
  },
): Group => ({
  id: group.id,
  name: group.name,
  description: group.description,
  locationName: group.locationName,
  usualSchedule: group.usualSchedule,
  visibility: group.visibility,
  status: group.status,
  createdAt: group.createdAt,
  activity: {
    id: group.activity.id,
    name: group.activity.name,
    icon: group.activity.icon,
    defaultMinParticipants: group.activity.defaultMinParticipants,
    defaultMaxParticipants: group.activity.defaultMaxParticipants,
  },
  memberCount: group._count.memberships,
});

// Newest first; the id breaks ties so cursor pages never skip or repeat.
const orderBy = [
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.GroupOrderByWithRelationInput[];

// Groups a stranger may find: public, not cancelled, and not ones they are in.
const discoverableBy = (userId: string): Prisma.GroupWhereInput => ({
  visibility: GroupVisibility.PUBLIC,
  status: GroupStatus.ACTIVE,
  memberships: { none: { userId } },
});

@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  // One nested write, so the group never exists without its owner.
  async createGroupWithOwner(
    data: CreateGroupData & { ownerId: string },
  ): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        locationName: data.locationName ?? null,
        usualSchedule: data.usualSchedule ?? null,
        activity: { connect: { id: data.activityId } },
        memberships: {
          create: { userId: data.ownerId, role: GroupRole.OWNER },
        },
      },
      include,
    });
    return mapPrismaGroupToDomain(group);
  }

  async getGroupById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include,
    });
    return group ? mapPrismaGroupToDomain(group) : null;
  }

  async listGroupsOfUser(userId: string): Promise<MyGroup[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId, group: { status: GroupStatus.ACTIVE } },
      include: { group: { include } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((membership) => ({
      ...mapPrismaGroupToDomain(membership.group),
      myRole: membership.role,
    }));
  }

  // Free-text match until groups have coordinates: "Praha" finds "Praha 8".
  async listGroupsInCity(
    userId: string,
    city: string,
    limit: number,
  ): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        ...discoverableBy(userId),
        locationName: { contains: city, mode: 'insensitive' },
      },
      include,
      orderBy,
      take: limit,
    });
    return groups.map(mapPrismaGroupToDomain);
  }

  async listDiscoverableGroups(
    userId: string,
    pageSize: number,
    cursor?: string,
  ): Promise<GroupPage> {
    const groups = await this.prisma.group.findMany({
      where: discoverableBy(userId),
      include,
      orderBy,
      // One extra row tells whether another page exists.
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const items = groups.slice(0, pageSize).map(mapPrismaGroupToDomain);
    return {
      items,
      nextCursor: groups.length > pageSize ? items[items.length - 1].id : null,
    };
  }

  async getUserCity(userId: string, now: Date): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        homeCity: true,
        temporaryCity: true,
        temporaryLocationValidUntil: true,
      },
    });
    if (!user) return null;
    // A temporary place always has its end date (CHECK in the migration).
    const isTemporaryValid =
      user.temporaryLocationValidUntil !== null &&
      user.temporaryLocationValidUntil > now;
    return isTemporaryValid ? user.temporaryCity : user.homeCity;
  }
}
