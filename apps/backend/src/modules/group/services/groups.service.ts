import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CreateGroupData, Group } from '@/modules/group/domain/group';
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
      throw new BadRequestException('Activity does not exist');
    }
    return this.groupRepository.createGroupWithOwner({
      ...data,
      // F-07.1: the founder owns the group; taken from the session, never
      // from the request body.
      ownerId: user.id,
    });
  }

  async getGroup(id: string): Promise<Group> {
    const group = await this.groupRepository.getGroupById(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }
}
