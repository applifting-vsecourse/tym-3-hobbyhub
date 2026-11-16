import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { AdminUserBlock } from '@/modules/user-block/domain/user-block';
import { UserBlockRepository } from '@/modules/user-block/repositories/user-block.repository';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserBlocksService } from './user-blocks.service';

// #239, ADR-0022: an administrator blocks two people from each other.

const admin = {
  id: 'admin1',
  email: 'a@example.com',
  name: 'Správce',
} as AdminIdentity;
const NOW = new Date('2030-01-01T12:00:00Z');
const REASON = 'Opakované obtěžování po akci.';

const aBlock: AdminUserBlock = {
  otherUser: { id: 'u2', name: 'Petr' },
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
    return {
      repository,
      participationRequests,
      membershipRequests,
      groups,
      service: new UserBlocksService(
        repository,
        participationRequests,
        membershipRequests,
        groups,
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
});
