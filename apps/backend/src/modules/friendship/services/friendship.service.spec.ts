import { FriendRequest } from '@/modules/friendship/domain/friendship';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';
import { mock } from 'jest-mock-extended';
import { FriendshipService } from './friendship.service';

describe('FriendshipService', () => {
  const setup = (): {
    repository: ReturnType<typeof mock<FriendshipRepository>>;
    service: FriendshipService;
  } => {
    const repository = mock<FriendshipRepository>();
    return { repository, service: new FriendshipService(repository) };
  };

  describe('areFriends', () => {
    it.each([true, false])('answers what is stored (%p)', async (stored) => {
      const { repository, service } = setup();
      repository.areFriends.mockResolvedValue(stored);
      await expect(service.areFriends('u1', 'u2')).resolves.toBe(stored);
      expect(repository.areFriends).toHaveBeenCalledWith('u1', 'u2');
    });

    it('never counts a person as their own friend, without asking', async () => {
      const { repository, service } = setup();
      await expect(service.areFriends('u1', 'u1')).resolves.toBe(false);
      expect(repository.areFriends).not.toHaveBeenCalled();
    });
  });

  describe('pendingRequestBetween', () => {
    const request: FriendRequest = {
      id: 'r1',
      senderId: 'u2',
      recipientId: 'u1',
      status: 'PENDING',
      requestedAt: new Date('2026-11-14T10:00:00Z'),
      decidedAt: null,
    };

    it('returns the request found in either direction', async () => {
      const { repository, service } = setup();
      repository.findPendingRequestBetween.mockResolvedValue(request);
      await expect(service.pendingRequestBetween('u1', 'u2')).resolves.toBe(
        request,
      );
    });

    it('has nothing pending with oneself, without asking', async () => {
      const { repository, service } = setup();
      await expect(service.pendingRequestBetween('u1', 'u1')).resolves.toBe(
        null,
      );
      expect(repository.findPendingRequestBetween).not.toHaveBeenCalled();
    });
  });
});
