import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { AdminUserBlock } from '@/modules/user-block/domain/user-block';
import { UserBlockRepository } from '@/modules/user-block/repositories/user-block.repository';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserBlocksService } from './user-blocks.service';

// #239, ADR-0022: an administrator blocks two people from each other. #65,
// ADR-0027: a user blocks another user.

const admin = {
  id: 'admin1',
  email: 'a@example.com',
  name: 'Správce',
} as AdminIdentity;
const NOW = new Date('2030-01-01T12:00:00Z');
const REASON = 'Opakované obtěžování po akci.';

const user = new Identity('u1', 'jana@example.com', 'Jana', true);

const aBlock: AdminUserBlock = {
  source: 'ADMINISTRATOR',
  otherUser: { id: 'u2', name: 'Petr' },
  isBlocker: false,
  reason: REASON,
  createdAt: NOW,
  createdBy: { id: 'admin1', name: 'Správce' },
};

describe('UserBlocksService', () => {
  const setup = (
    existing = ['u1', 'u2'],
  ): {
    repository: MockProxy<UserBlockRepository>;
    participationRequests: MockProxy<ParticipationRequestsService>;
    membershipRequests: MockProxy<MembershipRequestsService>;
    groups: MockProxy<GroupsService>;
    friendships: MockProxy<FriendshipService>;
    visibility: MockProxy<UserBlockVisibility>;
    service: UserBlocksService;
  } => {
    const repository = mock<UserBlockRepository>();
    repository.existingUserIds.mockImplementation((ids) =>
      Promise.resolve(ids.filter((id) => existing.includes(id))),
    );
    repository.createAdminBlock.mockResolvedValue(true);
    repository.deleteAdminBlock.mockResolvedValue(true);
    repository.listAdminBlocksOf.mockResolvedValue([aBlock]);
    const participationRequests = mock<ParticipationRequestsService>();
    const membershipRequests = mock<MembershipRequestsService>();
    const groups = mock<GroupsService>();
    const friendships = mock<FriendshipService>();
    repository.createUserBlock.mockResolvedValue(true);
    repository.deleteUserBlock.mockResolvedValue(true);
    const visibility = mock<UserBlockVisibility>();
    visibility.hiddenFor.mockResolvedValue([]);
    return {
      repository,
      participationRequests,
      membershipRequests,
      groups,
      friendships,
      visibility,
      service: new UserBlocksService(
        repository,
        participationRequests,
        membershipRequests,
        groups,
        friendships,
        visibility,
      ),
    };
  };

  describe('block', () => {
    it('writes the block with the trimmed reason, then undoes the ties', async () => {
      const {
        repository,
        participationRequests,
        membershipRequests,
        groups,
        friendships,
        service,
      } = setup();

      await expect(
        service.block(admin, 'u1', 'u2', `  ${REASON} `, NOW),
      ).resolves.toEqual([aBlock]);

      expect(repository.createAdminBlock).toHaveBeenCalledWith({
        a: 'u1',
        b: 'u2',
        adminId: 'admin1',
        reason: REASON,
      });
      expect(participationRequests.detachBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(membershipRequests.closeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(groups.removeBlockedPair).toHaveBeenCalledWith('u1', 'u2');
      // ADR-0026: the friendship and pending friend requests end too.
      expect(friendships.removeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      // The block exists before any tie is undone.
      expect(
        repository.createAdminBlock.mock.invocationCallOrder[0],
      ).toBeLessThan(
        participationRequests.detachBlockedPair.mock.invocationCallOrder[0],
      );
    });

    it('refuses to block someone from themselves', async () => {
      const { repository, service } = setup();

      await expect(
        service.block(admin, 'u1', 'u1', REASON, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createAdminBlock).not.toHaveBeenCalled();
    });

    it('answers 404 when either person does not exist', async () => {
      const { repository, service } = setup(['u1']);

      await expect(
        service.block(admin, 'u1', 'u2', REASON, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.createAdminBlock).not.toHaveBeenCalled();
    });

    it('refuses a pair blocked already, but finishes undoing the ties', async () => {
      const {
        repository,
        participationRequests,
        membershipRequests,
        groups,
        friendships,
        service,
      } = setup();
      repository.createAdminBlock.mockResolvedValue(false);

      await expect(
        service.block(admin, 'u1', 'u2', REASON, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      // A clean-up that failed after the block was written runs again.
      expect(participationRequests.detachBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(membershipRequests.closeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(groups.removeBlockedPair).toHaveBeenCalledWith('u1', 'u2');
      // ADR-0026: the friendship and pending friend requests end too.
      expect(friendships.removeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
    });
  });

  describe('unblock', () => {
    it('ends the block by the administrator', async () => {
      const { repository, service } = setup();

      await service.unblock(admin, 'u1', 'u2');

      expect(repository.deleteAdminBlock).toHaveBeenCalledWith({
        a: 'u1',
        b: 'u2',
        adminId: 'admin1',
      });
    });

    it('refuses a pair that is not blocked', async () => {
      const { repository, service } = setup();
      repository.deleteAdminBlock.mockResolvedValue(false);

      await expect(service.unblock(admin, 'u1', 'u2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('lists the blocks of an existing person, 404 for anyone else', async () => {
    const { service } = setup(['u1']);

    await expect(service.listBlocksOf('u1')).resolves.toEqual([aBlock]);
    await expect(service.listBlocksOf('nobody')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  // #65, ADR-0027: the blocker is the signed-in user.
  describe('blockAsUser', () => {
    it('writes the block of the signed-in user, then undoes the ties', async () => {
      const {
        repository,
        participationRequests,
        membershipRequests,
        groups,
        friendships,
        service,
      } = setup();

      await service.blockAsUser(user, 'u2', NOW);

      expect(repository.createUserBlock).toHaveBeenCalledWith('u1', 'u2');
      expect(participationRequests.detachBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(membershipRequests.closeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(groups.removeBlockedPair).toHaveBeenCalledWith('u1', 'u2');
      expect(friendships.removeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        NOW,
      );
      expect(
        repository.createUserBlock.mock.invocationCallOrder[0],
      ).toBeLessThan(
        participationRequests.detachBlockedPair.mock.invocationCallOrder[0],
      );
    });

    it('refuses to block oneself', async () => {
      const { repository, service } = setup();

      await expect(service.blockAsUser(user, 'u1', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.createUserBlock).not.toHaveBeenCalled();
    });

    it('answers 404 for someone who does not exist', async () => {
      const { repository, service } = setup(['u1']);

      await expect(service.blockAsUser(user, 'u2', NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.createUserBlock).not.toHaveBeenCalled();
    });

    // Someone hidden from the user does not exist for them, here too.
    it('answers 404 for someone hidden from the user', async () => {
      const { repository, visibility, service } = setup();
      visibility.hiddenFor.mockResolvedValue(['u2']);

      await expect(service.blockAsUser(user, 'u2', NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.createUserBlock).not.toHaveBeenCalled();
    });

    it('refuses someone blocked already, but finishes undoing the ties', async () => {
      const { repository, groups, service } = setup();
      repository.createUserBlock.mockResolvedValue(false);

      await expect(service.blockAsUser(user, 'u2', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(groups.removeBlockedPair).toHaveBeenCalledWith('u1', 'u2');
    });
  });

  describe('unblockAsUser', () => {
    it("ends the signed-in user's own block", async () => {
      const { repository, service } = setup();

      await service.unblockAsUser(user, 'u2');

      expect(repository.deleteUserBlock).toHaveBeenCalledWith('u1', 'u2');
    });

    it('refuses someone the user had not blocked', async () => {
      const { repository, service } = setup();
      repository.deleteUserBlock.mockResolvedValue(false);

      await expect(service.unblockAsUser(user, 'u2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('lists the people the signed-in user blocked', async () => {
    const { repository, service } = setup();
    const blocked = [{ id: 'u2', name: 'Petr', image: null, blockedAt: NOW }];
    repository.listBlockedBy.mockResolvedValue(blocked);

    await expect(service.listMine(user)).resolves.toEqual(blocked);
    expect(repository.listBlockedBy).toHaveBeenCalledWith('u1');
  });
});
