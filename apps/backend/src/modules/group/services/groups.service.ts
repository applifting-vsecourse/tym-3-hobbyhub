import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  AssignableGroupRole,
  CreateGroupData,
  DISCOVER_PAGE_SIZE,
  Group,
  GroupDiscoverFilter,
  GroupMember,
  GroupPage,
  GroupRole,
  hasGroupAdminRights,
  isPubliclyVisible,
  MemberAction,
  memberActionViolations,
  MyGroup,
  NEARBY_GROUPS_LIMIT,
  NearbyGroups,
} from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { emailNotVerifiedException } from '@/shared/auth/errors/email-not-verified.exception';
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

  // F-02.5: the detail is public, so only a public, active group is shown.
  // Anything else is "not found", so nobody can tell it exists.
  // TODO(F-07.1b #93): a private group is shown to its members.
  async getPublicGroup(id: string): Promise<Group> {
    const group = await this.groupRepository.getGroupById(id);
    if (!group || !isPubliclyVisible(group)) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  getMemberRole(groupId: string, userId: string): Promise<GroupRole | null> {
    return this.groupRepository.getMemberRole(groupId, userId);
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
  async listMembers(groupId: string, user: Identity): Promise<GroupMember[]> {
    const role = await this.groupRepository.getMemberRole(groupId, user.id);
    if (!role) throw new NotFoundException('Group not found');
    return this.groupRepository.listMembers(groupId);
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
    return this.groupRepository.listGroupsOfUser(user.id);
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
    );
    return { city, groups };
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
    );
  }
}
