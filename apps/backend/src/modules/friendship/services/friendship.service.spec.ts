import {
  FRIEND_SEARCH_PAGE_SIZE,
  FriendRequest,
} from '@/modules/friendship/domain/friendship';
import {
  FoundUserRow,
  FriendshipRepository,
  PendingRequestExistsError,
  StoredRelation,
} from '@/modules/friendship/repositories/friendship.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { FriendshipService } from './friendship.service';

const me = new Identity('u1', 'jana@example.com', 'Jana', 'user', true);

const pending = (senderId: string, recipientId: string): FriendRequest => ({
  id: 'r1',
  senderId,
  recipientId,
  status: 'PENDING',
  requestedAt: new Date('2026-11-14T10:00:00Z'),
  decidedAt: null,
});

const aFound = (id: string): FoundUserRow => ({
  id,
  name: `Person ${id}`,
  nickname: null,
  image: null,
});

const noRelations = (ids: readonly string[]): Map<string, StoredRelation> =>
  new Map(ids.map((id) => [id, { isFriend: false, pendingRequest: null }]));

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
    it('returns the request found in either direction', async () => {
      const { repository, service } = setup();
      const request = pending('u2', 'u1');
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

  describe('relationBetween', () => {
    it.each([
      ['none', false, null],
      ['request_sent', false, pending('u1', 'u2')],
      ['request_received', false, pending('u2', 'u1')],
      ['friends', true, null],
    ] as const)('answers %s', async (relation, isFriend, request) => {
      const { repository, service } = setup();
      repository.areFriends.mockResolvedValue(isFriend);
      repository.findPendingRequestBetween.mockResolvedValue(request);
      await expect(service.relationBetween('u1', 'u2')).resolves.toBe(relation);
    });

    it('has no relation with oneself, without asking', async () => {
      const { repository, service } = setup();
      await expect(service.relationBetween('u1', 'u1')).resolves.toBe('none');
      expect(repository.areFriends).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('asks for one row more than a page, for the viewer and the text', async () => {
      const { repository, service } = setup();
      repository.searchUsers.mockResolvedValue([]);
      repository.findRelationsWith.mockResolvedValue(new Map());
      await service.search(me, 'nov', 40);
      expect(repository.searchUsers).toHaveBeenCalledWith(
        'u1',
        'nov',
        40,
        FRIEND_SEARCH_PAGE_SIZE + 1,
      );
    });

    it("gives each person found the viewer's relation", async () => {
      const { repository, service } = setup();
      repository.searchUsers.mockResolvedValue([
        { id: 'u2', name: 'Libor', nickname: 'NovyHrac', image: 'data:x' },
        aFound('u3'),
      ]);
      repository.findRelationsWith.mockResolvedValue(
        new Map<string, StoredRelation>([
          ['u2', { isFriend: false, pendingRequest: { senderId: 'u2' } }],
          ['u3', { isFriend: true, pendingRequest: null }],
        ]),
      );
      await expect(service.search(me, 'li', 0)).resolves.toEqual({
        items: [
          {
            id: 'u2',
            name: 'Libor',
            nickname: 'NovyHrac',
            image: 'data:x',
            relation: 'request_received',
          },
          {
            id: 'u3',
            name: 'Person u3',
            nickname: null,
            image: null,
            relation: 'friends',
          },
        ],
        nextOffset: null,
      });
      expect(repository.findRelationsWith).toHaveBeenCalledWith('u1', [
        'u2',
        'u3',
      ]);
    });

    it('cuts the extra row and says where the next page starts', async () => {
      const { repository, service } = setup();
      repository.searchUsers.mockResolvedValue(
        Array.from({ length: FRIEND_SEARCH_PAGE_SIZE + 1 }, (_, i) =>
          aFound(`p${i}`),
        ),
      );
      repository.findRelationsWith.mockImplementation((_viewerId, ids) =>
        Promise.resolve(noRelations(ids)),
      );
      const page = await service.search(me, 'pe', 20);
      expect(page.items).toHaveLength(FRIEND_SEARCH_PAGE_SIZE);
      expect(page.items.map((item) => item.id)).not.toContain(
        `p${FRIEND_SEARCH_PAGE_SIZE}`,
      );
      expect(page.nextOffset).toBe(20 + FRIEND_SEARCH_PAGE_SIZE);
    });
  });

  describe('sendRequest', () => {
    const reachableStranger = (): ReturnType<typeof setup> => {
      const context = setup();
      context.repository.isReachable.mockResolvedValue(true);
      context.repository.areFriends.mockResolvedValue(false);
      context.repository.findPendingRequestBetween.mockResolvedValue(null);
      return context;
    };

    it('creates the request from the signed-in user', async () => {
      const { repository, service } = reachableStranger();
      await expect(service.sendRequest(me, 'u2')).resolves.toBe('request_sent');
      expect(repository.createRequest).toHaveBeenCalledWith('u1', 'u2');
    });

    it('refuses a request to oneself', async () => {
      const { repository, service } = reachableStranger();
      await expect(service.sendRequest(me, 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it('answers not found for a missing, blocked or deleted account', async () => {
      const { repository, service } = reachableStranger();
      repository.isReachable.mockResolvedValue(false);
      await expect(service.sendRequest(me, 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it('refuses a request between friends', async () => {
      const { repository, service } = reachableStranger();
      repository.areFriends.mockResolvedValue(true);
      await expect(service.sendRequest(me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it.each([
      ['a second request', pending('u1', 'u2')],
      ['a counter-request', pending('u2', 'u1')],
    ])('refuses %s while one waits', async (_case, request) => {
      const { repository, service } = reachableStranger();
      repository.findPendingRequestBetween.mockResolvedValue(request);
      await expect(service.sendRequest(me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it('turns a request that lost the race in the database into a conflict', async () => {
      const { repository, service } = reachableStranger();
      repository.createRequest.mockRejectedValue(
        new PendingRequestExistsError(),
      );
      await expect(service.sendRequest(me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('passes any other failure on', async () => {
      const { repository, service } = reachableStranger();
      const failure = new Error('db down');
      repository.createRequest.mockRejectedValue(failure);
      await expect(service.sendRequest(me, 'u2')).rejects.toBe(failure);
    });
  });
});
