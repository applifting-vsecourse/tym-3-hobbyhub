import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  CreateGroupData,
  Group,
  GroupRole,
} from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async createGroup(user: Identity, data: CreateGroupData): Promise<Group> {
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
    if (!group || group.visibility !== 'PUBLIC' || group.status !== 'ACTIVE') {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  getMemberRole(groupId: string, userId: string): Promise<GroupRole | null> {
    return this.groupRepository.getMemberRole(groupId, userId);
  }

  // The signed-in user leaves; who leaves comes from the session. The owner
  // cannot, or the group would be left without one (handing the group over
  // comes with member management, F-07.3 #48).
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const role = await this.groupRepository.getMemberRole(groupId, userId);
    if (!role)
      throw new NotFoundException('You are not a member of this group');
    if (role === 'OWNER') {
      throw new BadRequestException('The owner cannot leave the group');
    }
    await this.groupRepository.removeMember(groupId, userId);
  }
}
