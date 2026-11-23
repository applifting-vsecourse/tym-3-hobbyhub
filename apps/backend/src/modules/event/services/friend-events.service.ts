import {
  EventDetailWithFriends,
  EventPeriod,
  EventViewerScope,
  FRIEND_EVENTS_PAGE_SIZE,
  friendPeriodOf,
  FriendsEventPage,
  nextOffsetOf,
  PersonEventPage,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { GroupsService } from '@/modules/group/services/groups.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { Injectable } from '@nestjs/common';

// #226, ADR-0026: events seen through friends: a friend's events on their
// profile, the upcoming events of all my friends, and my friends on an event's
// detail. Which friends may be shown is the friendship module's (the two
// switches, filtered in the database); which events the viewer may see is
// this module's, with the rules of the event detail.
@Injectable()
export class FriendEventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventsService: EventsService,
    private readonly friendshipService: FriendshipService,
    private readonly groupsService: GroupsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  /**
   * A page of the events one person goes to or organizes, of those the
   * viewer may see. Whether the viewer may see this person's events at all
   * (a friend, the switch on) is the caller's to check first.
   */
  async getPersonEvents(
    personId: string,
    viewer: Identity,
    period: EventPeriod,
    offset: number,
    now: Date = new Date(),
  ): Promise<PersonEventPage> {
    const { items, total } = await this.eventRepository.getEventsWithPeople(
      [personId],
      { period, now, viewer: await this.scopeOf(viewer) },
      { limit: FRIEND_EVENTS_PAGE_SIZE, offset },
    );
    return {
      items,
      total,
      nextOffset: nextOffsetOf(offset, items.length, total),
    };
  }

  /**
   * „Akce přátel“: a page of the upcoming events my friends go to or
   * organize, soonest first, each once with which of them. Only friends who
   * let friends see their upcoming events count, in the names and the total.
   */
  async getFriendsEvents(
    viewer: Identity,
    offset: number,
    now: Date = new Date(),
  ): Promise<FriendsEventPage> {
    const friendIds = await this.friendshipService.friendIdsShowingEvents(
      viewer.id,
      'upcoming',
    );
    if (friendIds.length === 0)
      return { items: [], total: 0, nextOffset: null };
    const { items: events, total } =
      await this.eventRepository.getEventsWithPeople(
        friendIds,
        { period: 'upcoming', now, viewer: await this.scopeOf(viewer) },
        { limit: FRIEND_EVENTS_PAGE_SIZE, offset },
      );
    const friendsOn = await this.eventRepository.getPeopleOnEvents(
      events.map((event) => event.id),
      friendIds,
    );
    return {
      items: events.map((event) => ({
        event,
        friends: friendsOn.get(event.id) ?? [],
      })),
      total,
      nextOffset: nextOffsetOf(offset, events.length, total),
    };
  }

  /**
   * The detail with the checks of `EventsService.getEventDetail`, and for a
   * signed-in viewer the friends who go to or organize it and allowed it:
   * by „budoucí akce“ until it ends, by „historie akcí“ after. A cancelled
   * event, or one that did not take place, has none.
   */
  async getEventDetail(
    id: string,
    viewer: Identity | undefined,
    now: Date = new Date(),
  ): Promise<EventDetailWithFriends> {
    const event = await this.eventsService.getEventDetail(id, viewer);
    if (!viewer) return { event };
    const period = friendPeriodOf(event, now);
    if (!period) return { event, friends: [] };
    const friendIds = await this.friendshipService.friendIdsShowingEvents(
      viewer.id,
      period,
    );
    const friendsOn = await this.eventRepository.getPeopleOnEvents(
      [event.id],
      friendIds,
    );
    return { event, friends: friendsOn.get(event.id) ?? [] };
  }

  private async scopeOf(viewer: Identity): Promise<EventViewerScope> {
    const [groups, hiddenOrganizerIds] = await Promise.all([
      this.groupsService.listMyGroups(viewer),
      this.blocks.hiddenFor(viewer.id),
    ]);
    return {
      userId: viewer.id,
      groupIds: groups.map((group) => group.id),
      hiddenOrganizerIds,
    };
  }
}
