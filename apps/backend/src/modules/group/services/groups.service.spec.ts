import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { Group } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { GroupsService } from './groups.service';

const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'g1',
  name: 'Čtvrteční florbalisté',
  description: 'Hrajeme každý čtvrtek.',
  locationName: 'Praha 8',
  usualSchedule: 'Čtvrtky 19:00',
  visibility: 'PUBLIC',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  activity: { id: 'a1', name: 'Florbal', icon: 'florbal' },
  memberCount: 1,
  ...overrides,
});

const input = {
  name: 'Čtvrteční florbalisté',
  activityId: 'a1',
  description: 'Hrajeme každý čtvrtek.',
};

describe('GroupsService', () => {
  const setup = (
    isActivityAvailable = true,
  ): { repository: MockProxy<GroupRepository>; service: GroupsService } => {
    const repository = mock<GroupRepository>();
    const activities = mock<ActivitiesService>();
    activities.isAvailable.mockResolvedValue(isActivityAvailable);
    return {
      repository,
      service: new GroupsService(repository, activities),
    };
  };

  it('makes the signed-in user the owner of the new group', async () => {
    const { repository, service } = setup();
    const created = aGroup();
    repository.createGroupWithOwner.mockResolvedValue(created);

    await expect(
      service.createGroup({ id: 'u1' } as Identity, input),
    ).resolves.toEqual(created);
    expect(repository.createGroupWithOwner).toHaveBeenCalledWith({
      ...input,
      ownerId: 'u1',
    });
  });

  it('refuses an activity that does not exist or is retired', async () => {
    const { repository, service } = setup(false);

    await expect(
      service.createGroup({ id: 'u1' } as Identity, input),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createGroupWithOwner).not.toHaveBeenCalled();
  });

  it('reports a missing group as not found', async () => {
    const { repository, service } = setup();
    repository.getGroupById.mockResolvedValue(null);

    await expect(service.getGroup('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
