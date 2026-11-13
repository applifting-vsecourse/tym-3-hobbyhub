import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  GroupVisibility,
  Prisma,
  Activity as PrismaActivity,
  Group as PrismaGroup,
  GroupMembership as PrismaGroupMembership,
} from '@/generated/prisma/client';
import {
  AssignableGroupRole,
  CreateGroupData,
  GroupRole as DomainGroupRole,
  Group,
  GroupMember,
  GroupPage,
  MyGroup,
  TransferOwnershipResult,
} from '@/modules/group/domain/group';
import {
  ADMIN_PAGE_SIZE,
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { Injectable } from '@nestjs/common';

// Thrown inside the hand-over transaction only to roll it back.
class TargetNotMemberError extends Error {}

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

const memberInclude = {
  user: { select: { name: true, image: true } },
} as const;

const mapMembershipToMember = (
  membership: PrismaGroupMembership & {
    user: { name: string; image: string | null };
  },
): GroupMember => ({
  userId: membership.userId,
  name: membership.user.name,
  image: membership.user.image,
  role: membership.role,
  joinedAt: membership.joinedAt,
});

// Newest first; the id breaks ties so cursor pages never skip or repeat.
const orderBy = [
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.GroupOrderByWithRelationInput[];

// Groups a stranger may find: public, not cancelled, and not ones they are in.
// A visitor (no userId) is in none, so they find every such group.
const discoverableBy = (userId?: string): Prisma.GroupWhereInput => ({
  visibility: GroupVisibility.PUBLIC,
  status: GroupStatus.ACTIVE,
  ...(userId ? { memberships: { none: { userId } } } : {}),
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

  // F-07.3: the owner first, then admins and members, each by who joined
  // first. The `group_role` enum sorts in that order.
  async listMembers(groupId: string): Promise<GroupMember[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { groupId },
      include: memberInclude,
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { id: 'asc' }],
    });
    return memberships.map(mapMembershipToMember);
  }

  // ADR-0015: who is told about a new request to join (the founder and the
  // admins, ADR-0007).
  async listAdminIds(groupId: string): Promise<string[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { groupId, role: { in: [GroupRole.OWNER, GroupRole.ADMIN] } },
      select: { userId: true },
    });
    return memberships.map((membership) => membership.userId);
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMembership.deleteMany({
      where: { groupId, userId },
    });
  }

  // `null` when the member left or was removed after the service checked
  // the roles.
  async setMemberRole(
    groupId: string,
    userId: string,
    role: AssignableGroupRole,
  ): Promise<GroupMember | null> {
    const { count } = await this.prisma.groupMembership.updateMany({
      where: { groupId, userId },
      data: { role },
    });
    if (count === 0) return null;
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: memberInclude,
    });
    return membership ? mapMembershipToMember(membership) : null;
  }

  // ADR-0007: the old owner stays on as an admin. Demoted first, inside one
  // transaction: `group_membership_one_owner_key` allows one OWNER at a time.
  // The demotion matches only an OWNER row, so of two hand-overs at once the
  // second finds the actor already demoted; a new owner who has left in the
  // meantime rolls the demotion back.
  async transferOwnership(
    groupId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<TransferOwnershipResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const demoted = await tx.groupMembership.updateMany({
          where: { groupId, userId: fromUserId, role: GroupRole.OWNER },
          data: { role: GroupRole.ADMIN },
        });
        if (demoted.count === 0) return 'NOT_OWNER';
        const promoted = await tx.groupMembership.updateMany({
          where: { groupId, userId: toUserId },
          data: { role: GroupRole.OWNER },
        });
        if (promoted.count === 0) throw new TargetNotMemberError();
        return 'TRANSFERRED';
      });
    } catch (error) {
      if (error instanceof TargetNotMemberError) return 'TARGET_NOT_MEMBER';
      throw error;
    }
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
  // TODO(F-02.6 #10): it also finds "Mostiště" for "Most" and "Brno-venkov"
  // for "Brno"; match by distance once groups and users have coordinates.
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
    userId: string | undefined,
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
    // A temporary place always has its end date (CHECK in the migration),
    // but not always a city; without one the home city still applies.
    const isTemporaryValid =
      user.temporaryLocationValidUntil !== null &&
      user.temporaryLocationValidUntil > now &&
      Boolean(user.temporaryCity?.trim());
    return isTemporaryValid ? user.temporaryCity : user.homeCity;
  }

  // #238: every group for the administration, newest first, by name.
  async listForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<Group>> {
    const where: Prisma.GroupWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};
    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.offset,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.group.count({ where }),
    ]);
    return { items: groups.map(mapPrismaGroupToDomain), total };
  }
}
