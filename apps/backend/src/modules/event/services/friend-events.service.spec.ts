import {
  EventDetail,
  EventFriend,
  EventListItem,
  FRIEND_EVENTS_PAGE_SIZE,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { MyGroup } from '@/modules/group/domain/group';
import { GroupsService } from '@/modules/group/services/groups.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { FriendEventsService } from './friend-events.service';

const viewer = new Identity('me', 'jana@example.com', 'Jana', true);
const now = new Date('2026-11-16T12:00:00Z');

const anItem = (id: string): EventListItem => ({ id }) as EventListItem;

const aDetail = (overrides: Partial<EventDetail> = {}): EventDetail =>
  ({
    id: 'e1',
    status: 'PUBLISHED',
    endAt: new Date('2026-11-20T12:00:00Z'),
    ...overrides,
  }) as EventDetail;

const libor: EventFriend = { id: 'f1', name: 'Libor', image: null };

describe('FriendEventsService (#226)', () => {
  const setup = (): {
    repository: ReturnType<typeof mock<EventRepository>>;
    eventsService: ReturnType<typeof mock<EventsService>>;
    friendship: ReturnType<typeof mock<FriendshipService>>;
    service: FriendEventsService;
  } => {
    const repository = mock<EventRepository>();
    const eventsService = mock<EventsService>();
    const friendship = mock<FriendshipService>();
    const groups = mock<GroupsService>();
    groups.listMyGroups.mockResolvedValue([{ id: 'g1' } as MyGroup]);
    const blocks = mock<UserBlockVisibility>();
    blocks.hiddenFor.mockResolvedValue(['blocked']);
    repository.getPeopleOnEvents.mockResolvedValue(new Map());
    return {
      repository,
      eventsService,
      friendship,
      service: new FriendEventsService(
        repository,
        eventsService,
        friendship,
        groups,
        blocks,
      ),
    };
  };

  const scope = {
    userId: 'me',
    groupIds: ['g1'],
    hiddenOrganizerIds: ['blocked'],
  };

  describe('getPersonEvents', () => {
    it("asks for the person's events the viewer may see, a page at a time", async () => {
      const { repository, service } = setup();
      repository.getEventsWithPeople.mockResolvedValue({
        items: Array.from({ length: FRIEND_EVENTS_PAGE_SIZE }, (_, i) =>
          anItem(`e${i}`),
        ),
        total: 25,
      });

      await expect(
        service.getPersonEvents('f1', viewer, 'past', 10, now),
      ).resolves.toMatchObject({ total: 25, nextOffset: 20 });
      expect(repository.getEventsWithPeople).toHaveBeenCalledWith(
        ['f1'],
        { period: 'past', now, viewer: scope },
        { limit: FRIEND_EVENTS_PAGE_SIZE, offset: 10 },
      );
    });
  });

  describe('getFriendsEvents', () => {
    it('lists the upcoming events of friends who allow it, with which of them', async () => {
      const { repository, friendship, service } = setup();
      friendship.friendIdsShowingEvents.mockResolvedValue(['f1', 'f2']);
      repository.getEventsWithPeople.mockResolvedValue({
        items: [anItem('e1'), anItem('e2')],
        total: 2,
      });
      repository.getPeopleOnEvents.mockResolvedValue(
        new Map([['e1', [libor]]]),
      );

      await expect(service.getFriendsEvents(viewer, 0, now)).resolves.toEqual({
        items: [
          { event: anItem('e1'), friends: [libor] },
          { event: anItem('e2'), friends: [] },
        ],
        total: 2,
        nextOffset: null,
      });
      expect(friendship.friendIdsShowingEvents).toHaveBeenCalledWith(
        'me',
        'upcoming',
      );
      expect(repository.getEventsWithPeople).toHaveBeenCalledWith(
        ['f1', 'f2'],
        { period: 'upcoming', now, viewer: scope },
        { limit: FRIEND_EVENTS_PAGE_SIZE, offset: 0 },
      );
      expect(repository.getPeopleOnEvents).toHaveBeenCalledWith(
        ['e1', 'e2'],
        ['f1', 'f2'],
      );
    });

    it('is empty without a friend who allows it, without asking for events', async () => {
      const { repository, friendship, service } = setup();
      friendship.friendIdsShowingEvents.mockResolvedValue([]);

      await expect(service.getFriendsEvents(viewer, 0, now)).resolves.toEqual({
        items: [],
        total: 0,
        nextOffset: null,
      });
      expect(repository.getEventsWithPeople).not.toHaveBeenCalled();
    });
  });

  describe('getEventDetail', () => {
    it('gives a visitor no friends at all', async () => {
      const { eventsService, friendship, service } = setup();
      eventsService.getEventDetail.mockResolvedValue(aDetail());

      const detail = await service.getEventDetail('e1', undefined, now);

      expect(detail).not.toHaveProperty('friends');
      expect(friendship.friendIdsShowingEvents).not.toHaveBeenCalled();
    });

    it.each([
      ['an upcoming event', '2026-11-20T12:00:00Z', 'upcoming'],
      ['an event going on now', '2026-11-16T13:00:00Z', 'upcoming'],
      ['a past event', '2026-11-10T12:00:00Z', 'past'],
    ] as const)(
      'names friends on %s by the %s switch',
      async (_, endAt, period) => {
        const { repository, eventsService, friendship, service } = setup();
        eventsService.getEventDetail.mockResolvedValue(
          aDetail({ endAt: new Date(endAt) }),
        );
        friendship.friendIdsShowingEvents.mockResolvedValue(['f1']);
        repository.getPeopleOnEvents.mockResolvedValue(
          new Map([['e1', [libor]]]),
        );

        await expect(
          service.getEventDetail('e1', viewer, now),
        ).resolves.toMatchObject({ friends: [libor] });
        expect(friendship.friendIdsShowingEvents).toHaveBeenCalledWith(
          'me',
          period,
        );
      },
    );

    it.each(['CANCELLED', 'NOT_HELD'] as const)(
      'names nobody on a %s event',
      async (status) => {
        const { eventsService, friendship, service } = setup();
        eventsService.getEventDetail.mockResolvedValue(aDetail({ status }));

        await expect(
          service.getEventDetail('e1', viewer, now),
        ).resolves.toMatchObject({ friends: [] });
        expect(friendship.friendIdsShowingEvents).not.toHaveBeenCalled();
      },
    );

    it('has an empty list when no friend who allows it goes', async () => {
      const { eventsService, friendship, service } = setup();
      eventsService.getEventDetail.mockResolvedValue(aDetail());
      friendship.friendIdsShowingEvents.mockResolvedValue([]);

      await expect(
        service.getEventDetail('e1', viewer, now),
      ).resolves.toMatchObject({ friends: [] });
    });

    it('keeps the 404 of an event the viewer may not see', async () => {
      const { eventsService, friendship, service } = setup();
      eventsService.getEventDetail.mockRejectedValue(new NotFoundException());

      await expect(
        service.getEventDetail('e1', viewer, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(friendship.friendIdsShowingEvents).not.toHaveBeenCalled();
    });
  });
});
