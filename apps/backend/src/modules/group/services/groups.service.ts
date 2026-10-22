import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  CreateGroupData,
  DISCOVER_PAGE_SIZE,
  Group,
  GroupPage,
  MyGroup,
  NEARBY_GROUPS_LIMIT,
  NearbyGroups,
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

  async getGroup(id: string): Promise<Group> {
    const group = await this.groupRepository.getGroupById(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
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
  ): Promise<GroupPage> {
    return this.groupRepository.listDiscoverableGroups(
      user?.id,
      DISCOVER_PAGE_SIZE,
      cursor,
    );
  }
}
