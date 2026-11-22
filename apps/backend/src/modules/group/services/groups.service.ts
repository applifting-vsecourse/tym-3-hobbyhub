import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import {
  AdminGroupDetail,
  AssignableGroupRole,
  CreateGroupData,
  DISCOVER_PAGE_SIZE,
  Group,
  GroupAccess,
  GroupDiscoverFilter,
  GroupMember,
  GroupMemberListItem,
  GroupPage,
  groupPlaceViolations,
  groupRequiredFieldsSetToNull,
  GroupRole,
  GroupStats,
  hasGroupAdminRights,
  isPubliclyVisible,
  MemberAction,
  memberActionViolations,
  MyGroup,
  NEARBY_GROUPS_LIMIT,
  NearbyGroups,
  TrendingGroup,
  UpdateGroupData,
} from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import {
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { Identity } from '@/shared/auth/domain/identity';
import { emailNotVerifiedException } from '@/shared/auth/errors/email-not-verified.exception';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const targetNotMemberException = (): NotFoundException =>
  new NotFoundException('The user is not a member of this group');

const notAllowedException = (): ForbiddenException =>
  new ForbiddenException('Your role in the group does not allow this');

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly activitiesService: ActivitiesService,
    private readonly friendshipService: FriendshipService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  async createGroup(user: Identity, data: CreateGroupData): Promise<Group> {
    // F-03.2: founding a group needs a verified e-mail.
    if (!user.emailVerified) {
      throw emailNotVerifiedException('founding a group');
    }
    if (!(await this.activitiesService.isAvailable(data.activityId))) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    return this.groupRepository.createGroupWithOwner({
      ...data,
      // F-07.1: the founder owns the group; taken from the session, never
      // from the request body.
      ownerId: user.id,
    });
  }

  // ADR-0028: what the admins of a group may change. A place comes with its
  // position or not at all.
  async updateGroup(
    groupId: string,
    user: Identity,
    data: UpdateGroupData,
  ): Promise<Group> {
    await this.assertManagedGroup(groupId, user);
    const nulled = groupRequiredFieldsSetToNull(data);
    if (nulled.length > 0) {
      throw new BadRequestException(`${nulled.join(', ')} cannot be removed`);
    }
    if (groupPlaceViolations(data).length > 0) {
      throw new BadRequestException(
        'The place needs its name and both coordinates together',
      );
    }
    if (
      data.activityId !== undefined &&
      !(await this.activitiesService.isAvailable(data.activityId))
    ) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    const group = await this.groupRepository.updateGroup(groupId, data);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  // Adds a member to a group that lets anyone in (ADR-0028). The rules of who
  // may join (a rejection is final, ADR-0014) live in `MembershipRequestsService`,
  // which asks the group for this.
  addMember(groupId: string, userId: string): Promise<boolean> {
    return this.groupRepository.addMember(groupId, userId);
  }

  async getStats(
    groupId: string,
    viewer?: Identity,
    now = new Date(),
  ): Promise<GroupStats> {
    await this.assertPublicGroup(groupId, viewer);
    return this.groupRepository.getGroupStats(groupId, now);
  }

  // F-02.5: the detail is public, so only a public, active group is shown.
  // Anything else is "not found", so nobody can tell it exists; so is the
  // group run by someone blocked from the viewer (#239).
  // TODO(F-07.1b #93): a private group is shown to its members.
  async getPublicGroup(id: string, viewer?: Identity): Promise<Group> {
    const group = await this.groupRepository.getGroupById(
      id,
      await this.blocks.hiddenFor(viewer?.id),
    );
    if (!group || !isPubliclyVisible(group)) {
      throw new NotFoundException('Group not found');
    }
    if (viewer && (await this.isRunByHidden(id, viewer.id))) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  // The same rules as `getPublicGroup`, for callers that only need to know the
  // group may be seen: it reads no counts and no next event.
  async assertPublicGroup(id: string, viewer?: Identity): Promise<GroupAccess> {
    const group = await this.groupRepository.getGroupAccess(id);
    if (!group || !isPubliclyVisible(group)) {
      throw new NotFoundException('Group not found');
    }
    if (viewer && (await this.isRunByHidden(id, viewer.id))) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  // ADR-0022: the owner and the admins run the group, the same people a block
  // removes members from (`removeBlockedPair`). A member still sees their own
  // group: where both of the pair run it, both stay.
  private async isRunByHidden(
    groupId: string,
    viewerId: string,
  ): Promise<boolean> {
    const hidden = await this.blocks.hiddenFor(viewerId);
    if (hidden.length === 0) return false;
    const [role, managerIds] = await Promise.all([
      this.groupRepository.getMemberRole(groupId, viewerId),
      this.groupRepository.listAdminIds(groupId),
    ]);
    return role === null && managerIds.some((id) => hidden.includes(id));
  }

  getMemberRole(groupId: string, userId: string): Promise<GroupRole | null> {
    return this.groupRepository.getMemberRole(groupId, userId);
  }

  // `getManagedGroup` without the group: for a change that only needs to know
  // the user may make it.
  async assertManagedGroup(groupId: string, user: Identity): Promise<void> {
    const [group, role] = await Promise.all([
      this.groupRepository.getGroupAccess(groupId),
      this.groupRepository.getMemberRole(groupId, user.id),
    ]);
    if (!group || !role || !hasGroupAdminRights(role)) {
      throw new NotFoundException('Group not found');
    }
  }

  // F-07.3: a group the user manages (OWNER or ADMIN, ADR-0007), cancelled
  // or not. Anyone else gets "not found", as for an event they do not
  // organize, so every admin-only feature asks here and none checks itself.
  async getManagedGroup(groupId: string, user: Identity): Promise<Group> {
    const [group, role] = await Promise.all([
      this.groupRepository.getGroupById(groupId),
      this.groupRepository.getMemberRole(groupId, user.id),
    ]);
    if (!group || !role || !hasGroupAdminRights(role)) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  // Who manages the group (OWNER and ADMIN, ADR-0007), for the notifications
  // about a new request to join (ADR-0015). Public facts only: ids.
  getAdminIds(groupId: string): Promise<string[]> {
    return this.groupRepository.listAdminIds(groupId);
  }

  // F-07.3: the member list is for the group's members (visibility matrix);
  // F-02.5 shows a visitor the count, never the members. Anyone else gets
  // "not found", as for the admin-only features.
  // #225: each member with the viewer's friendship to them, so the list can
  // offer a friend request or show where one stands.
  async listMembers(
    groupId: string,
    user: Identity,
  ): Promise<GroupMemberListItem[]> {
    const role = await this.groupRepository.getMemberRole(groupId, user.id);
    if (!role) throw new NotFoundException('Group not found');
    // #239: members blocked from the one asking are not on the list.
    const members = await this.groupRepository.listMembers(
      groupId,
      await this.blocks.hiddenFor(user.id),
    );
    // #225: each with the asker's relation to them.
    const relations = await this.friendshipService.relationsWith(
      user.id,
      members.map((member) => member.userId),
    );
    return members.map((member) => ({
      ...member,
      relation: relations.get(member.userId) ?? 'none',
    }));
  }

  // F-07.3b: who acts comes from the session. ADR-0007 decides who may do
  // what to whom (`memberActionViolations`).
  async removeMember(
    groupId: string,
    user: Identity,
    targetUserId: string,
  ): Promise<void> {
    await this.assertMemberAction(groupId, user, targetUserId, {
      kind: 'remove',
    });
    await this.groupRepository.removeMember(groupId, targetUserId);
  }

  async changeMemberRole(
    groupId: string,
    user: Identity,
    targetUserId: string,
    role: AssignableGroupRole,
  ): Promise<GroupMember> {
    await this.assertMemberAction(groupId, user, targetUserId, {
      kind: 'setRole',
      role,
    });
    const member = await this.groupRepository.setMemberRole(
      groupId,
      targetUserId,
      role,
    );
    // The member left, or another admin removed them, since the check.
    if (!member) throw targetNotMemberException();
    return member;
  }

  // The owner hands the group over and stays on as an admin (ADR-0007).
  async transferOwnership(
    groupId: string,
    user: Identity,
    targetUserId: string,
  ): Promise<void> {
    await this.assertMemberAction(groupId, user, targetUserId, {
      kind: 'transferOwnership',
    });
    const result = await this.groupRepository.transferOwnership(
      groupId,
      user.id,
      targetUserId,
    );
    // The roles changed since the check: another hand-over was faster, or
    // the new owner left.
    if (result === 'NOT_OWNER') throw notAllowedException();
    if (result === 'TARGET_NOT_MEMBER') throw targetNotMemberException();
  }

  // Someone outside the group gets "not found", as for the other member
  // features; a member without the right gets 403, since they know the
  // group and its members anyway.
  private async assertMemberAction(
    groupId: string,
    user: Identity,
    targetUserId: string,
    action: MemberAction,
  ): Promise<void> {
    const [actorRole, targetRole] = await Promise.all([
      this.groupRepository.getMemberRole(groupId, user.id),
      this.groupRepository.getMemberRole(groupId, targetUserId),
    ]);
    if (!actorRole) throw new NotFoundException('Group not found');
    if (!targetRole) throw targetNotMemberException();
    const violations = memberActionViolations(
      { userId: user.id, role: actorRole },
      { userId: targetUserId, role: targetRole },
      action,
    );
    if (violations.includes('ACTING_ON_SELF')) {
      throw new BadRequestException(
        'Use leaving the group to act on your own membership',
      );
    }
    if (violations.includes('NOT_ALLOWED')) throw notAllowedException();
  }

  // The signed-in user leaves; who leaves comes from the session. The owner
  // cannot, or the group would be left without one: they hand it over first
  // (`transferOwnership`) and then leave as an admin.
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const role = await this.groupRepository.getMemberRole(groupId, userId);
    if (!role)
      throw new NotFoundException('You are not a member of this group');
    if (role === 'OWNER') {
      throw new BadRequestException('The owner cannot leave the group');
    }
    await this.groupRepository.removeMember(groupId, userId);
  }

  async listMyGroups(user: Identity): Promise<MyGroup[]> {
    return this.groupRepository.listGroupsOfUser(
      user.id,
      await this.blocks.hiddenFor(user.id),
    );
  }

  async listNearbyGroups(
    user: Identity,
    now = new Date(),
  ): Promise<NearbyGroups> {
    const city = (await this.groupRepository.getUserCity(user.id, now))?.trim();
    if (!city) return { city: null, groups: [] };
    const groups = await this.groupRepository.listGroupsInCity(
      user.id,
      city,
      NEARBY_GROUPS_LIMIT,
      await this.blocks.hiddenFor(user.id),
    );
    return { city, groups };
  }

  // #215 "Skupiny pro tebe": groups of the person's activities they are not in.
  async listGroupsForActivities(
    user: Identity,
    activityIds: string[],
    limit: number,
  ): Promise<Group[]> {
    return this.groupRepository.listGroupsOfActivities(
      user.id,
      activityIds,
      limit,
      await this.blocks.hiddenFor(user.id),
    );
  }

  // #215 "Trendy skupiny": the most new members since `since`. A signed-in
  // person does not get the groups they are already in.
  async listTrendingGroups(
    viewer: Identity | undefined,
    since: Date,
    limit: number,
  ): Promise<TrendingGroup[]> {
    return this.groupRepository.listTrendingGroups(
      viewer?.id,
      since,
      limit,
      await this.blocks.hiddenFor(viewer?.id),
    );
  }

  // A visitor (no user) sees every public group.
  async discoverGroups(
    user: Identity | undefined,
    cursor?: string,
    filter: GroupDiscoverFilter = { activityIds: [] },
  ): Promise<GroupPage> {
    return this.groupRepository.listDiscoverableGroups(
      user?.id,
      DISCOVER_PAGE_SIZE,
      cursor,
      filter,
      await this.blocks.hiddenFor(user?.id),
    );
  }

  // #238: the administration sees every group (visibility matrix: Superadmin).
  listGroupsForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<Group>> {
    return this.groupRepository.listForAdministration(query);
  }

  async getGroupForAdministration(id: string): Promise<AdminGroupDetail> {
    const group = await this.groupRepository.getGroupById(id);
    if (!group) throw new NotFoundException('Group not found');
    const members = await this.groupRepository.listMembers(id);
    return { group, members };
  }

  // #239, ADR-0022: called by the administration once two people are blocked
  // from each other. Nobody is told: the block must not show.
  removeBlockedPair(a: string, b: string): Promise<void> {
    return this.groupRepository.removeBlockedPair(a, b);
  }
}
