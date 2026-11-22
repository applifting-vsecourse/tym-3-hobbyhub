import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  GroupVisibility,
  ParticipationStatus,
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
  GroupAccess,
  GroupDiscoverFilter,
  GroupMember,
  GroupPage,
  GroupStats,
  MyGroup,
  TransferOwnershipResult,
  TrendingGroup,
  UpdateGroupData,
} from '@/modules/group/domain/group';
import {
  ADMIN_PAGE_SIZE,
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { searchWords } from '@/shared/search/fold-for-search';
import { containsInAny } from '@/shared/search/folded-search';
import { Injectable } from '@nestjs/common';

// Thrown inside the hand-over transaction only to roll it back.
class TargetNotMemberError extends Error {}

// #269: a group is "active" while it has a public event upcoming or ended in
// this many days; nothing to store, the repository counts them.
const ACTIVE_WITHIN_DAYS = 60;

const TAKEN_STATUSES = [
  ParticipationStatus.APPROVED,
  ParticipationStatus.ATTENDED,
];

// #239: `hiddenOrganizerIds` are the people blocked from the viewer; their
// events are not the group's next event for that viewer.
const groupInclude = (hiddenOrganizerIds: string[] = [], now = new Date()) =>
  ({
    activity: true,
    _count: {
      select: {
        memberships: true,
        events: {
          where: {
            // The same events the numbers on the group's page count.
            status: { in: ['PUBLISHED', 'FINISHED'] },
            isHidden: false,
            visibility: 'PUBLIC',
            endAt: {
              gt: new Date(now.getTime() - ACTIVE_WITHIN_DAYS * 86_400_000),
            },
          },
        },
      },
    },
    // The next public event, for the list (ADR-0028): when, and whether a seat
    // is free.
    events: {
      where: {
        status: 'PUBLISHED',
        isHidden: false,
        visibility: 'PUBLIC',
        endAt: { gt: now },
        ...(hiddenOrganizerIds.length > 0
          ? {
              organizerId: { notIn: hiddenOrganizerIds },
              coOrganizers: { none: { id: { in: hiddenOrganizerIds } } },
            }
          : {}),
      },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take: 1,
      select: {
        id: true,
        title: true,
        startAt: true,
        maxParticipants: true,
        externalOccupiedSpots: true,
        _count: {
          select: {
            participations: { where: { status: { in: TAKEN_STATUSES } } },
          },
        },
      },
    },
  }) satisfies Prisma.GroupInclude;

const mapPrismaGroupToDomain = (
  group: PrismaGroup & {
    activity: PrismaActivity;
    _count: { memberships: number; events: number };
    events: {
      id: string;
      title: string;
      startAt: Date;
      maxParticipants: number;
      externalOccupiedSpots: number;
      _count: { participations: number };
    }[];
  },
): Group => {
  const next = group.events[0];
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    locationName: group.locationName,
    usualSchedule: group.usualSchedule,
    tagline: group.tagline,
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
    isActive: group._count.events > 0,
    approvalMode: group.approvalMode,
    meetingDays: group.meetingDays,
    latitude: group.locationLatitude ? Number(group.locationLatitude) : null,
    longitude: group.locationLongitude ? Number(group.locationLongitude) : null,
    nextEvent: next
      ? {
          id: next.id,
          title: next.title,
          startAt: next.startAt,
          hasFreeSeats:
            next._count.participations + next.externalOccupiedSpots <
            next.maxParticipants,
        }
      : null,
  };
};

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
const discoverableBy = (
  userId?: string,
  hiddenManagerIds: string[] = [],
): Prisma.GroupWhereInput => ({
  visibility: GroupVisibility.PUBLIC,
  status: GroupStatus.ACTIVE,
  ...(userId ? { memberships: { none: { userId } } } : {}),
  // #239, ADR-0022: a group run (OWNER or ADMIN) by someone blocked from the
  // viewer does not exist.
  ...(hiddenManagerIds.length > 0
    ? {
        NOT: {
          memberships: {
            some: {
              role: { in: [GroupRole.OWNER, GroupRole.ADMIN] },
              userId: { in: hiddenManagerIds },
            },
          },
        },
      }
    : {}),
});

// Every word of the search has to match the name, place or activity, and every
// word of the location the place, ignoring case and diacritics (aliases: `g` the
// group, `a` its activity).
const textConditionsOf = ({
  search,
  location,
}: GroupDiscoverFilter): Prisma.Sql[] => [
  ...searchWords(search).map(
    (word) =>
      Prisma.sql`(${containsInAny(
        [
          Prisma.sql`g."name"`,
          Prisma.sql`g."locationName"`,
          Prisma.sql`a."name"`,
        ],
        word,
      )})`,
  ),
  ...searchWords(location).map(
    (word) =>
      Prisma.sql`(${containsInAny([Prisma.sql`g."locationName"`], word)})`,
  ),
];

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
        locationName: data.locationName,
        usualSchedule: data.usualSchedule ?? null,
        tagline: data.tagline ?? null,
        approvalMode: data.approvalMode ?? 'APPROVAL',
        meetingDays: data.meetingDays ?? [],
        locationLatitude: data.latitude,
        locationLongitude: data.longitude,
        activity: { connect: { id: data.activityId } },
        memberships: {
          create: { userId: data.ownerId, role: GroupRole.OWNER },
        },
      },
      include: groupInclude(),
    });
    return mapPrismaGroupToDomain(group);
  }

  // For checks of access: no counts, no next event.
  async getGroupAccess(id: string): Promise<GroupAccess | null> {
    return this.prisma.group.findUnique({
      where: { id },
      select: { id: true, visibility: true, status: true, approvalMode: true },
    });
  }

  async getGroupById(
    id: string,
    hiddenOrganizerIds: string[] = [],
  ): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: groupInclude(hiddenOrganizerIds),
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
  async listMembers(
    groupId: string,
    // #239: members blocked from the one asking are left out.
    hiddenUserIds: string[] = [],
  ): Promise<GroupMember[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: {
        groupId,
        ...(hiddenUserIds.length > 0
          ? { userId: { notIn: hiddenUserIds } }
          : {}),
      },
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

  async listGroupsOfUser(
    userId: string,
    hiddenOrganizerIds: string[] = [],
  ): Promise<MyGroup[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId, group: { status: GroupStatus.ACTIVE } },
      include: { group: { include: groupInclude(hiddenOrganizerIds) } },
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
    hiddenManagerIds: string[] = [],
  ): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        ...discoverableBy(userId, hiddenManagerIds),
        locationName: { contains: city, mode: 'insensitive' },
      },
      include: groupInclude(hiddenManagerIds),
      orderBy,
      take: limit,
    });
    return groups.map(mapPrismaGroupToDomain);
  }

  // The newest-first list pages by keyset (createdAt, id), so a group created
  // while someone reads never repeats or skips a row. The other orders (by
  // distance, by members) have no stable key, so their cursor is an offset
  // (ADR-0028). SQL picks the ids of the page; Prisma loads the rows and applies
  // the visibility rules again, so SQL never decides who may see a group.
  async listDiscoverableGroups(
    userId: string | undefined,
    pageSize: number,
    cursor?: string,
    filter: GroupDiscoverFilter = { activityIds: [] },
    hiddenManagerIds: string[] = [],
  ): Promise<GroupPage> {
    const isKeyset =
      filter.sort !== 'members' && !(filter.sort === 'nearest' && filter.near);
    const offset = Number.parseInt(cursor ?? '0', 10);
    const start =
      !isKeyset && Number.isInteger(offset) && offset > 0 ? offset : 0;
    // One extra row tells whether another page exists.
    const take = pageSize + 1;
    const ids = await this.pageIds(
      userId,
      filter,
      take,
      { offset: start, afterId: isKeyset ? cursor : undefined },
      hiddenManagerIds,
    );
    const groups = await this.prisma.group.findMany({
      where: { ...discoverableBy(userId, hiddenManagerIds), id: { in: ids } },
      include: groupInclude(hiddenManagerIds),
    });
    const ordered = ids.flatMap(
      (id) => groups.find((group) => group.id === id) ?? [],
    );
    const items = ordered.slice(0, pageSize).map(mapPrismaGroupToDomain);
    const lastItem = items[items.length - 1];
    const hasMore = ids.length > pageSize;
    return {
      items,
      nextCursor:
        !hasMore || !lastItem
          ? null
          : isKeyset
            ? lastItem.id
            : String(start + pageSize),
    };
  }

  private async pageIds(
    userId: string | undefined,
    filter: GroupDiscoverFilter,
    take: number,
    page: { offset: number; afterId?: string },
    hiddenManagerIds: string[],
  ): Promise<string[]> {
    const { activityIds, near } = filter;
    const distance = near
      ? Prisma.sql`(6371 * 2 * asin(sqrt(
          power(sin(radians(g."locationLatitude"::float8 - ${near.latitude}) / 2), 2)
          + cos(radians(${near.latitude})) * cos(radians(g."locationLatitude"::float8))
          * power(sin(radians(g."locationLongitude"::float8 - ${near.longitude}) / 2), 2))))`
      : null;
    const conditions = [
      Prisma.sql`g."visibility" = 'PUBLIC' AND g."status" = 'ACTIVE'`,
      ...(userId
        ? [
            Prisma.sql`NOT EXISTS (SELECT 1 FROM "group_membership" m WHERE m."groupId" = g."id" AND m."userId" = ${userId})`,
          ]
        : []),
      ...(activityIds.length > 0
        ? [Prisma.sql`g."activityId" IN (${Prisma.join(activityIds)})`]
        : []),
      // #239, ADR-0022: as in `discoverableBy`, so the page is not cut short.
      ...(hiddenManagerIds.length > 0
        ? [
            Prisma.sql`NOT EXISTS (SELECT 1 FROM "group_membership" m WHERE m."groupId" = g."id" AND m."role" IN ('OWNER', 'ADMIN') AND m."userId" IN (${Prisma.join(hiddenManagerIds)}))`,
          ]
        : []),
      ...(filter.approvalMode
        ? [
            Prisma.sql`g."approvalMode" = ${filter.approvalMode}::"group_approval_mode"`,
          ]
        : []),
      ...(filter.onlyWithUpcomingEvent
        ? [
            Prisma.sql`EXISTS (SELECT 1 FROM "event" e WHERE e."groupId" = g."id" AND e."status" = 'PUBLISHED' AND NOT e."isHidden" AND e."visibility" = 'PUBLIC' AND e."endAt" > now())`,
          ]
        : []),
      ...(distance && near
        ? [
            Prisma.sql`g."locationLatitude" IS NOT NULL AND ${distance} <= ${near.radiusKm}`,
          ]
        : []),
      ...(page.afterId
        ? [
            Prisma.sql`(g."createdAt", g."id") < (SELECT c."createdAt", c."id" FROM "group" c WHERE c."id" = ${page.afterId})`,
          ]
        : []),
      ...textConditionsOf(filter),
    ];
    const order =
      filter.sort === 'nearest' && distance
        ? Prisma.sql`${distance} ASC, g."id" DESC`
        : filter.sort === 'members'
          ? Prisma.sql`(SELECT count(*) FROM "group_membership" c WHERE c."groupId" = g."id") DESC, g."id" DESC`
          : Prisma.sql`g."createdAt" DESC, g."id" DESC`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT g."id" FROM "group" g
      JOIN "activity" a ON a."id" = g."activityId"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY ${order}
      LIMIT ${take} OFFSET ${page.offset}`;
    return rows.map((row) => row.id);
  }

  // A group's numbers: its public events that have happened, and how many
  // people came on average (ADR-0028). Public facts.
  async getGroupStats(groupId: string, now: Date): Promise<GroupStats> {
    const [row] = await this.prisma.$queryRaw<
      { played: number; average: number }[]
    >`
      SELECT count(*)::int AS played, COALESCE(avg(t.taken), 0)::float AS average
      FROM (
        SELECT (
          SELECT count(*) FROM "participation" p
          WHERE p."eventId" = e."id" AND p."status" IN ('APPROVED', 'ATTENDED')
        ) + e."externalOccupiedSpots" AS taken
        FROM "event" e
        WHERE e."groupId" = ${groupId}
          AND e."status" IN ('PUBLISHED', 'FINISHED')
          AND NOT e."isHidden"
          AND e."visibility" = 'PUBLIC'
          AND e."endAt" <= ${now}
      ) t`;
    return {
      playedEvents: row?.played ?? 0,
      averageParticipants: Math.round((row?.average ?? 0) * 10) / 10,
    };
  }

  async updateGroup(id: string, data: UpdateGroupData): Promise<Group | null> {
    const group = await this.prisma.group
      .update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.activityId !== undefined
            ? { activity: { connect: { id: data.activityId } } }
            : {}),
          ...(data.usualSchedule !== undefined
            ? { usualSchedule: data.usualSchedule }
            : {}),
          ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
          ...(data.approvalMode !== undefined
            ? { approvalMode: data.approvalMode }
            : {}),
          ...(data.meetingDays !== undefined
            ? { meetingDays: data.meetingDays }
            : {}),
          ...(data.locationName !== undefined
            ? { locationName: data.locationName }
            : {}),
          ...(data.latitude !== undefined && data.longitude !== undefined
            ? {
                locationLatitude: data.latitude,
                locationLongitude: data.longitude,
              }
            : {}),
        },
        include: groupInclude(),
      })
      .catch((error: unknown) => {
        // Only a group that is gone is "not found"; a failing database or a
        // broken constraint must not look like one.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          return null;
        }
        throw error;
      });
    return group ? mapPrismaGroupToDomain(group) : null;
  }

  // Joining a group that lets anyone in (ADR-0028). False when the person was
  // already in.
  async addMember(groupId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.groupMembership.createMany({
      data: [{ groupId, userId, role: GroupRole.MEMBER }],
      skipDuplicates: true,
    });
    return count > 0;
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
        include: groupInclude(),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.offset,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.group.count({ where }),
    ]);
    return { items: groups.map(mapPrismaGroupToDomain), total };
  }

  // #239, ADR-0022: one of two blocked people leaves, as a plain member, the
  // groups the other owns or runs. Where both run the group, both stay.
  async removeBlockedPair(a: string, b: string): Promise<void> {
    await this.prisma.$transaction(
      [
        [a, b],
        [b, a],
      ].map(([managerId, userId]) =>
        this.prisma.groupMembership.deleteMany({
          where: {
            userId,
            role: GroupRole.MEMBER,
            group: {
              memberships: {
                some: {
                  userId: managerId,
                  role: { in: [GroupRole.OWNER, GroupRole.ADMIN] },
                },
              },
            },
          },
        }),
      ),
    );
  }
  // #215 "Skupiny pro tebe": discoverable groups of these activities, the
  // biggest first.
  async listGroupsOfActivities(
    userId: string,
    activityIds: string[],
    limit: number,
    hiddenManagerIds: string[] = [],
  ): Promise<Group[]> {
    if (activityIds.length === 0) return [];
    const groups = await this.prisma.group.findMany({
      where: {
        ...discoverableBy(userId, hiddenManagerIds),
        activityId: { in: activityIds },
      },
      include: groupInclude(hiddenManagerIds),
      orderBy: [{ memberships: { _count: 'desc' } }, { id: 'asc' }],
      take: limit,
    });
    return groups.map(mapPrismaGroupToDomain);
  }

  // #215 "Trendy skupiny": discoverable groups with the most members who
  // joined since `since`, then the biggest; when few groups grew lately, the
  // biggest fill the row.
  async listTrendingGroups(
    userId: string | undefined,
    since: Date,
    limit: number,
    hiddenManagerIds: string[] = [],
  ): Promise<TrendingGroup[]> {
    const notMemberOf = userId
      ? Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM "group_membership" mine
          WHERE mine."groupId" = g."id" AND mine."userId" = ${userId})`
      : Prisma.empty;
    const notRunBy =
      hiddenManagerIds.length > 0
        ? Prisma.sql`AND NOT EXISTS (
            SELECT 1 FROM "group_membership" runs
            WHERE runs."groupId" = g."id"
              AND runs."role" IN ('OWNER', 'ADMIN')
              AND runs."userId" IN (${Prisma.join(hiddenManagerIds)}))`
        : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      { id: string; recentMemberCount: number }[]
    >`
      SELECT g."id",
        count(*) FILTER (WHERE m."joinedAt" >= ${since})::int AS "recentMemberCount"
      FROM "group" g
      JOIN "group_membership" m ON m."groupId" = g."id"
      WHERE g."visibility" = 'PUBLIC' AND g."status" = 'ACTIVE'
        ${notMemberOf}
        ${notRunBy}
      GROUP BY g."id"
      ORDER BY "recentMemberCount" DESC, count(*) DESC, g."id" ASC
      LIMIT ${limit}`;
    // The same rules as `discoverableBy`, in SQL before the limit, so the row
    // is still full for someone in many of the top groups (review of PR #293).
    // Prisma applies them once more on loading.
    const groups = await this.prisma.group.findMany({
      where: {
        ...discoverableBy(userId, hiddenManagerIds),
        id: { in: rows.map((row) => row.id) },
      },
      include: groupInclude(hiddenManagerIds),
    });
    const byId = new Map(groups.map((group) => [group.id, group]));
    return rows.flatMap((row) => {
      const group = byId.get(row.id);
      return group
        ? [
            {
              ...mapPrismaGroupToDomain(group),
              recentMemberCount: row.recentMemberCount,
            },
          ]
        : [];
    });
  }
}
