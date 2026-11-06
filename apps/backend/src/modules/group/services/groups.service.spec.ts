import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  DISCOVER_PAGE_SIZE,
  Group,
  GroupRole,
  NEARBY_GROUPS_LIMIT,
} from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  activity: {
    id: 'a1',
    name: 'Florbal',
    icon: 'florbal',
    defaultMinParticipants: 8,
    defaultMaxParticipants: 12,
  },
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

  // ADR-0015: who is told about a new request to join.
  it('names the founder and the admins as the group’s managers', async () => {
    const { repository, service } = setup();
    repository.listAdminIds.mockResolvedValue(['owner', 'admin']);

    await expect(service.getAdminIds('g1')).resolves.toEqual([
      'owner',
      'admin',
    ]);
    expect(repository.listAdminIds).toHaveBeenCalledWith('g1');
  });

  it('makes the signed-in user the owner of the new group', async () => {
    const { repository, service } = setup();
    const created = aGroup();
    repository.createGroupWithOwner.mockResolvedValue(created);

    await expect(
      service.createGroup({ id: 'u1', emailVerified: true } as Identity, input),
    ).resolves.toEqual(created);
    expect(repository.createGroupWithOwner).toHaveBeenCalledWith({
      ...input,
      ownerId: 'u1',
    });
  });

  it('refuses an unverified e-mail and founds nothing', async () => {
    const { repository, service } = setup();

    const error = await service
      .createGroup({ id: 'u1', emailVerified: false } as Identity, input)
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      (error as BadRequestException).getResponse() as { violations: unknown },
    ).toMatchObject({ violations: ['EMAIL_NOT_VERIFIED'] });
    expect(repository.createGroupWithOwner).not.toHaveBeenCalled();
  });

  it('refuses an activity that does not exist or is retired', async () => {
    const { repository, service } = setup(false);

    await expect(
      service.createGroup({ id: 'u1', emailVerified: true } as Identity, input),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createGroupWithOwner).not.toHaveBeenCalled();
  });

  it('reports a missing group as not found', async () => {
    const { repository, service } = setup();
    repository.getGroupById.mockResolvedValue(null);

    await expect(service.getPublicGroup('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('shows a public active group', async () => {
    const { repository, service } = setup();
    const group = aGroup();
    repository.getGroupById.mockResolvedValue(group);

    await expect(service.getPublicGroup('g1')).resolves.toBe(group);
  });

  it.each([
    ['private', { visibility: 'PRIVATE' as const }],
    ['cancelled', { status: 'CANCELLED' as const }],
  ])('hides a %s group as not found', async (_name, overrides) => {
    const { repository, service } = setup();
    repository.getGroupById.mockResolvedValue(aGroup(overrides));

    await expect(service.getPublicGroup('g1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports the role of a member, or none', async () => {
    const { repository, service } = setup();
    repository.getMemberRole.mockResolvedValue('MEMBER');

    await expect(service.getMemberRole('g1', 'u1')).resolves.toBe('MEMBER');
    expect(repository.getMemberRole).toHaveBeenCalledWith('g1', 'u1');
  });

  describe('managing a group (F-07.3)', () => {
    const user = { id: 'u1', emailVerified: true } as Identity;

    it.each(['OWNER', 'ADMIN'] as const)(
      'gives a %s the group they manage',
      async (role) => {
        const { repository, service } = setup();
        const group = aGroup();
        repository.getGroupById.mockResolvedValue(group);
        repository.getMemberRole.mockResolvedValue(role);

        await expect(service.getManagedGroup('g1', user)).resolves.toBe(group);
      },
    );

    it.each([
      ['a member', 'MEMBER' as const],
      ['someone outside the group', null],
    ])('answers %s with not found', async (_name, role) => {
      const { repository, service } = setup();
      repository.getGroupById.mockResolvedValue(aGroup());
      repository.getMemberRole.mockResolvedValue(role);

      await expect(service.getManagedGroup('g1', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists the members to every member, not to outsiders', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockResolvedValue(null);

      await expect(service.listMembers('g1', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.listMembers).not.toHaveBeenCalled();

      repository.getMemberRole.mockResolvedValue('MEMBER');
      repository.listMembers.mockResolvedValue([]);
      await expect(service.listMembers('g1', user)).resolves.toEqual([]);
    });
  });

  describe('member management (F-07.3b)', () => {
    const user = { id: 'me', emailVerified: true } as Identity;
    const roles = (
      actor: GroupRole | null,
      target: GroupRole | null,
    ): ((groupId: string, userId: string) => Promise<GroupRole | null>) =>
      jest.fn((_groupId: string, userId: string) =>
        Promise.resolve(userId === 'me' ? actor : target),
      );

    it('lets an admin remove a member', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('ADMIN', 'MEMBER'));

      await service.removeMember('g1', user, 'other');

      expect(repository.removeMember).toHaveBeenCalledWith('g1', 'other');
    });

    it('refuses an admin removing another admin', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('ADMIN', 'ADMIN'));

      await expect(
        service.removeMember('g1', user, 'other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.removeMember).not.toHaveBeenCalled();
    });

    it('answers someone outside the group with not found', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles(null, 'MEMBER'));

      await expect(
        service.removeMember('g1', user, 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reports a target who is not a member as not found', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('OWNER', null));

      await expect(
        service.changeMemberRole('g1', user, 'other', 'ADMIN'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.setMemberRole).not.toHaveBeenCalled();
    });

    it('refuses acting on oneself', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockResolvedValue('OWNER');

      await expect(
        service.removeMember('g1', user, 'me'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.removeMember).not.toHaveBeenCalled();
    });

    it('lets the owner name an admin', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('OWNER', 'MEMBER'));
      const member = {
        userId: 'other',
        name: 'Jana',
        image: null,
        role: 'ADMIN' as const,
        joinedAt: new Date('2026-01-01T12:00:00Z'),
      };
      repository.setMemberRole.mockResolvedValue(member);

      await expect(
        service.changeMemberRole('g1', user, 'other', 'ADMIN'),
      ).resolves.toBe(member);
      expect(repository.setMemberRole).toHaveBeenCalledWith(
        'g1',
        'other',
        'ADMIN',
      );
    });

    it('refuses an admin naming an admin', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('ADMIN', 'MEMBER'));

      await expect(
        service.changeMemberRole('g1', user, 'other', 'ADMIN'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.setMemberRole).not.toHaveBeenCalled();
    });

    it('lets the owner hand the group over', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('OWNER', 'MEMBER'));

      await service.transferOwnership('g1', user, 'other');

      expect(repository.transferOwnership).toHaveBeenCalledWith(
        'g1',
        'me',
        'other',
      );
    });

    it('refuses an admin handing the group over', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockImplementation(roles('ADMIN', 'MEMBER'));

      await expect(
        service.transferOwnership('g1', user, 'other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.transferOwnership).not.toHaveBeenCalled();
    });
  });

  it('lets a member leave', async () => {
    const { repository, service } = setup();
    repository.getMemberRole.mockResolvedValue('MEMBER');

    await service.leaveGroup('g1', 'u1');

    expect(repository.removeMember).toHaveBeenCalledWith('g1', 'u1');
  });

  it('lets an admin leave too', async () => {
    const { repository, service } = setup();
    repository.getMemberRole.mockResolvedValue('ADMIN');

    await service.leaveGroup('g1', 'u1');

    expect(repository.removeMember).toHaveBeenCalledWith('g1', 'u1');
  });

  it('keeps the owner in the group', async () => {
    const { repository, service } = setup();
    repository.getMemberRole.mockResolvedValue('OWNER');

    await expect(service.leaveGroup('g1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.removeMember).not.toHaveBeenCalled();
  });

  it('refuses to remove someone who is not a member', async () => {
    const { repository, service } = setup();
    repository.getMemberRole.mockResolvedValue(null);

    await expect(service.leaveGroup('g1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.removeMember).not.toHaveBeenCalled();
  });

  describe('nearby groups', () => {
    const user = { id: 'u1', emailVerified: true } as Identity;
    const now = new Date('2026-10-18T10:00:00Z');

    it('searches the city of the signed-in user', async () => {
      const { repository, service } = setup();
      const nearby = [aGroup()];
      repository.getUserCity.mockResolvedValue(' Praha ');
      repository.listGroupsInCity.mockResolvedValue(nearby);

      await expect(service.listNearbyGroups(user, now)).resolves.toEqual({
        city: 'Praha',
        groups: nearby,
      });
      expect(repository.getUserCity).toHaveBeenCalledWith('u1', now);
      expect(repository.listGroupsInCity).toHaveBeenCalledWith(
        'u1',
        'Praha',
        NEARBY_GROUPS_LIMIT,
      );
    });

    it.each([null, '', '   '])(
      'does not search without a city (%p)',
      async (city) => {
        const { repository, service } = setup();
        repository.getUserCity.mockResolvedValue(city);

        await expect(service.listNearbyGroups(user, now)).resolves.toEqual({
          city: null,
          groups: [],
        });
        expect(repository.listGroupsInCity).not.toHaveBeenCalled();
      },
    );
  });

  it('pages discoverable groups for the signed-in user', async () => {
    const { repository, service } = setup();
    const page = { items: [aGroup()], nextCursor: null };
    repository.listDiscoverableGroups.mockResolvedValue(page);

    await expect(
      service.discoverGroups(
        { id: 'u1', emailVerified: true } as Identity,
        'g0',
      ),
    ).resolves.toEqual(page);
    expect(repository.listDiscoverableGroups).toHaveBeenCalledWith(
      'u1',
      DISCOVER_PAGE_SIZE,
      'g0',
    );
  });

  it('pages every discoverable group for a visitor', async () => {
    const { repository, service } = setup();
    repository.listDiscoverableGroups.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    await service.discoverGroups(undefined);
    expect(repository.listDiscoverableGroups).toHaveBeenCalledWith(
      undefined,
      DISCOVER_PAGE_SIZE,
      undefined,
    );
  });
});
