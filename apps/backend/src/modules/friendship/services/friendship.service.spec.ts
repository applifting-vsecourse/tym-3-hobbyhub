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

  // #239, ADR-0022: the clean-up of a block by an administrator.
  describe('removeBlockedPair', () => {
    it('ends the friendship and the pending requests of the pair', async () => {
      const { repository, service } = setup();
      const now = new Date('2030-01-01T12:00:00Z');
      await service.removeBlockedPair('u1', 'u2', now);
      expect(repository.removeBlockedPair).toHaveBeenCalledWith(
        'u1',
        'u2',
        now,
      );
    });

    it('does nothing for one person, without asking', async () => {
      const { repository, service } = setup();
      await service.removeBlockedPair('u1', 'u1');
      expect(repository.removeBlockedPair).not.toHaveBeenCalled();
    });
  });
});
