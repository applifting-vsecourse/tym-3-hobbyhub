import {
  FRIEND_SEARCH_PAGE_SIZE,
  FriendRequest,
  RECEIVED_FRIEND_REQUESTS_PAGE_SIZE,
  ReceivedFriendRequest,
} from '@/modules/friendship/domain/friendship';
import {
  FoundUserRow,
  FriendshipRepository,
  PendingRequestExistsError,
  StoredRelation,
} from '@/modules/friendship/repositories/friendship.repository';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
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
    notifications: ReturnType<typeof mock<NotificationsService>>;
    service: FriendshipService;
  } => {
    const repository = mock<FriendshipRepository>();
    const notifications = mock<NotificationsService>();
    return {
      repository,
      notifications,
      service: new FriendshipService(repository, notifications),
    };
  };

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

  describe('relationsWith', () => {
    it("answers each person's relation, and none for oneself", async () => {
      const { repository, service } = setup();
      repository.findRelationsWith.mockResolvedValue(
        new Map<string, StoredRelation>([
          ['u2', { isFriend: true, pendingRequest: null }],
          ['u3', { isFriend: false, pendingRequest: { senderId: 'u3' } }],
        ]),
      );
      const relations = await service.relationsWith('u1', ['u1', 'u2', 'u3']);
      expect(Object.fromEntries(relations)).toEqual({
        u1: 'none',
        u2: 'friends',
        u3: 'request_received',
      });
      expect(repository.findRelationsWith).toHaveBeenCalledWith('u1', [
        'u2',
        'u3',
      ]);
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
      context.repository.countRequestsSince.mockResolvedValue(0);
      context.repository.createRequest.mockResolvedValue('r1');
      return context;
    };

    afterEach(() => jest.useRealTimers());

    it('creates the request from the signed-in user', async () => {
      const { repository, service } = reachableStranger();
      await expect(service.sendRequest(me, 'u2')).resolves.toEqual({
        relation: 'request_sent',
        notifyRecipient: true,
      });
      expect(repository.createRequest).toHaveBeenCalledWith('u1', 'u2');
    });

    it('tells the recipient about the request (#228)', async () => {
      const { notifications, service } = reachableStranger();
      await service.sendRequest(me, 'u2');
      expect(notifications.notifyFriendRequest).toHaveBeenCalledWith({
        request: { id: 'r1' },
        sender: me,
        recipientId: 'u2',
      });
    });

    it('tells nobody about a request over the limit (#228)', async () => {
      const { repository, notifications, service } = reachableStranger();
      repository.countRequestsSince.mockResolvedValue(3);
      await service.sendRequest(me, 'u2');
      expect(repository.createRequest).toHaveBeenCalled();
      expect(notifications.notifyFriendRequest).not.toHaveBeenCalled();
    });

    it('tells nobody when the request was refused', async () => {
      const { repository, notifications, service } = reachableStranger();
      repository.areFriends.mockResolvedValue(true);
      await expect(service.sendRequest(me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(notifications.notifyFriendRequest).not.toHaveBeenCalled();
    });

    // The recipient hears of at most 3 requests from the same sender an hour.
    it.each([
      [0, true],
      [2, true],
      [3, false],
      [7, false],
    ])(
      'with %i earlier requests within the hour, notifies the recipient: %p',
      async (earlier, notifyRecipient) => {
        jest.useFakeTimers().setSystemTime(new Date('2026-11-15T12:00:00Z'));
        const { repository, service } = reachableStranger();
        repository.countRequestsSince.mockResolvedValue(earlier);
        await expect(service.sendRequest(me, 'u2')).resolves.toMatchObject({
          notifyRecipient,
        });
        expect(repository.countRequestsSince).toHaveBeenCalledWith(
          'u1',
          'u2',
          new Date('2026-11-15T11:00:00Z'),
        );
        expect(repository.createRequest).toHaveBeenCalled();
      },
    );

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

  describe('withdrawRequest', () => {
    it('takes back my pending request, leaving no relation', async () => {
      const { repository, service } = setup();
      repository.withdrawPendingRequest.mockResolvedValue('r1');
      await expect(service.withdrawRequest(me, 'u2')).resolves.toBe('none');
      expect(repository.withdrawPendingRequest).toHaveBeenCalledWith(
        'u1',
        'u2',
        expect.any(Date),
      );
    });

    it("removes the recipient's notification of it (#228)", async () => {
      const { repository, notifications, service } = setup();
      repository.withdrawPendingRequest.mockResolvedValue('r1');
      await service.withdrawRequest(me, 'u2');
      expect(
        notifications.removeFriendRequestNotifications,
      ).toHaveBeenCalledWith({ id: 'r1' });
    });

    // Never sent, already decided, or it is the other one asking me.
    it('answers a conflict when I have no pending request to the person', async () => {
      const { repository, notifications, service } = setup();
      repository.withdrawPendingRequest.mockResolvedValue(null);
      await expect(service.withdrawRequest(me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        notifications.removeFriendRequestNotifications,
      ).not.toHaveBeenCalled();
    });

    it('refuses oneself, without asking', async () => {
      const { repository, service } = setup();
      await expect(service.withdrawRequest(me, 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.withdrawPendingRequest).not.toHaveBeenCalled();
    });
  });

  describe('listReceivedRequests (#228)', () => {
    const aReceived = (id: string): ReceivedFriendRequest => ({
      id,
      requestedAt: new Date('2026-11-15T10:00:00Z'),
      sender: {
        id: `s-${id}`,
        name: `Sender ${id}`,
        nickname: null,
        image: null,
      },
    });

    it('asks for a page of the requests waiting for me', async () => {
      const { repository, service } = setup();
      repository.listReceivedRequests.mockResolvedValue({
        items: [],
        total: 0,
      });
      await expect(service.listReceivedRequests(me, 0)).resolves.toEqual({
        items: [],
        total: 0,
        nextOffset: null,
      });
      expect(repository.listReceivedRequests).toHaveBeenCalledWith(
        'u1',
        0,
        RECEIVED_FRIEND_REQUESTS_PAGE_SIZE,
      );
    });

    it('says where the next page starts while more wait', async () => {
      const { repository, service } = setup();
      const items = Array.from(
        { length: RECEIVED_FRIEND_REQUESTS_PAGE_SIZE },
        (_, index) => aReceived(String(index)),
      );
      repository.listReceivedRequests.mockResolvedValue({ items, total: 45 });
      await expect(service.listReceivedRequests(me, 20)).resolves.toMatchObject(
        { total: 45, nextOffset: 40 },
      );
    });

    it('has no next page after the last one', async () => {
      const { repository, service } = setup();
      repository.listReceivedRequests.mockResolvedValue({
        items: [aReceived('a')],
        total: 21,
      });
      await expect(service.listReceivedRequests(me, 20)).resolves.toMatchObject(
        { nextOffset: null },
      );
    });
  });

  describe.each([
    ['acceptRequest', 'acceptPendingRequest', 'friends'],
    ['rejectRequest', 'rejectPendingRequest', 'none'],
  ] as const)('%s (#228)', (method, repositoryMethod, relation) => {
    const reachableSender = (): ReturnType<typeof setup> => {
      const context = setup();
      context.repository.isReachable.mockResolvedValue(true);
      context.repository[repositoryMethod].mockResolvedValue('r1');
      return context;
    };

    it('decides the pending request the sender sent me', async () => {
      const { repository, service } = reachableSender();
      await expect(service[method](me, 'u2')).resolves.toBe(relation);
      expect(repository[repositoryMethod]).toHaveBeenCalledWith(
        'u2',
        'u1',
        expect.any(Date),
      );
    });

    it('marks my notification of the request read', async () => {
      const { notifications, service } = reachableSender();
      await service[method](me, 'u2');
      expect(
        notifications.markFriendRequestNotificationRead,
      ).toHaveBeenCalledWith(me, { id: 'r1' });
    });

    it('answers a conflict when nothing waits (decided elsewhere, withdrawn)', async () => {
      const { repository, notifications, service } = reachableSender();
      repository[repositoryMethod].mockResolvedValue(null);
      await expect(service[method](me, 'u2')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        notifications.markFriendRequestNotificationRead,
      ).not.toHaveBeenCalled();
      expect(notifications.notifyFriendRequestAccepted).not.toHaveBeenCalled();
    });

    it('refuses oneself, without asking', async () => {
      const { repository, service } = reachableSender();
      await expect(service[method](me, 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository[repositoryMethod]).not.toHaveBeenCalled();
    });

    it('answers not found for a blocked or deleted sender', async () => {
      const { repository, service } = reachableSender();
      repository.isReachable.mockResolvedValue(false);
      await expect(service[method](me, 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository[repositoryMethod]).not.toHaveBeenCalled();
    });
  });

  it('tells the sender their request was accepted (#228)', async () => {
    const { repository, notifications, service } = setup();
    repository.isReachable.mockResolvedValue(true);
    repository.acceptPendingRequest.mockResolvedValue('r1');
    await service.acceptRequest(me, 'u2');
    expect(notifications.notifyFriendRequestAccepted).toHaveBeenCalledWith({
      request: { id: 'r1' },
      senderId: 'u2',
      acceptedBy: me,
    });
  });

  it('tells nobody about a rejection (#228)', async () => {
    const { repository, notifications, service } = setup();
    repository.isReachable.mockResolvedValue(true);
    repository.rejectPendingRequest.mockResolvedValue('r1');
    await service.rejectRequest(me, 'u2');
    expect(notifications.notifyFriendRequestAccepted).not.toHaveBeenCalled();
    expect(notifications.notifyFriendRequest).not.toHaveBeenCalled();
  });
});
