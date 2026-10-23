import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  Activity as PrismaActivity,
  Group as PrismaGroup,
} from '@/generated/prisma/client';
import {
  CreateGroupData,
  GroupRole as DomainGroupRole,
  Group,
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

  async getMemberRole(
    groupId: string,
    userId: string,
  ): Promise<DomainGroupRole | null> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMembership.deleteMany({
      where: { groupId, userId },
    });
  }
}
