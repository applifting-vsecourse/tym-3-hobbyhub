import {
  EventListItem,
  LandingEventSelection,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { Group } from '@/modules/group/domain/group';
import { GroupsService } from '@/modules/group/services/groups.service';
import {
  candidateLimitOf,
  isGroupRow,
  Landing,
  LANDING_CITIES_LIMIT,
  LANDING_ROW_ORDER,
  LandingEvent,
  LandingEventRow,
  LandingFriend,
  LandingGroup,
  LandingGroupRow,
  LandingNear,
  LandingRowKind,
  lastMinuteUntil,
  pickRows,
  todayOf,
  trendingSince,
  weekendOf,
} from '@/modules/landing/domain/landing';
import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

type Viewer = {
  identity: Identity;
  profile: Onboarding;
  friends: LandingFriend[];
};

// #215: the landing page puts its rows together from what the other modules
// answer; it owns no data. Who may see what stays with them: the event
// module keeps to the public list and the blocks, the friendship module
// gives only friends who allowed it.
@Injectable()
export class LandingService {
  constructor(
    private readonly events: EventsService,
    private readonly groups: GroupsService,
    private readonly friendships: FriendshipService,
    private readonly onboarding: OnboardingService,
    private readonly ratings: RatingsService,
  ) {}

  async getLanding(
    identity: Identity | undefined,
    query: { city?: string },
    now: Date = new Date(),
  ): Promise<Landing> {
    const viewer = identity ? await this.viewerOf(identity) : undefined;
    const order: readonly LandingRowKind[] = viewer
      ? LANDING_ROW_ORDER.member
      : LANDING_ROW_ORDER.visitor;

    // Around the home within the travel radius; without both, by city: the
    // one picked on the page, else the home city, else the busiest one.
    const home = viewer?.profile.address;
    const radiusKm = viewer?.profile.travelRadiusKm;
    const around =
      home && radiusKm
        ? { latitude: home.latitude, longitude: home.longitude, radiusKm }
        : undefined;
    const cities = around
      ? []
      : await this.events.getLandingCities(LANDING_CITIES_LIMIT, identity, now);
    const city = around
      ? undefined
      : query.city?.trim() || home?.city || cities[0]?.city || undefined;
    const near: LandingNear | null =
      around && home
        ? { mode: 'radius', city: home.city, ...around }
        : city
          ? { mode: 'city', city }
          : null;

    const selectionOf = (
      kind: LandingEventRow,
    ): LandingEventSelection | null => {
      const limit = candidateLimitOf(order, kind);
      switch (kind) {
        case 'lastMinute':
          return {
            order: 'soonest',
            limit,
            startsBefore: lastMinuteUntil(now),
          };
        case 'top':
          return { order: 'top', limit };
        case 'liked':
          return viewer
            ? { order: 'soonest', limit, likedBy: viewer.identity.id }
            : null;
        case 'friends':
          return viewer && viewer.friends.length > 0
            ? {
                order: 'soonest',
                limit,
                attendedByAnyOf: viewer.friends.map((friend) => friend.id),
              }
            : null;
        case 'near':
          return around
            ? { order: 'nearest', limit, around }
            : city
              ? { order: 'soonest', limit, city }
              : null;
        case 'today':
          return { order: 'soonest', limit, ...todayOf(now) };
        case 'weekend':
          return { order: 'soonest', limit, ...weekendOf(now) };
      }
    };

    const eventRows = order
      .filter((kind): kind is LandingEventRow => !isGroupRow(kind))
      .flatMap((kind) => {
        const selection = selectionOf(kind);
        return selection ? [{ kind, selection }] : [];
      });
    const groupRows = order.filter(isGroupRow);

    const [eventIds, groupLists] = await Promise.all([
      this.events.getLandingEventIds(
        eventRows.map((row) => row.selection),
        identity,
        now,
      ),
      Promise.all(
        groupRows.map((kind) =>
          this.groupsOf(kind, viewer, candidateLimitOf(order, kind), now),
        ),
      ),
    ]);

    const groupsById = new Map<string, LandingGroup>();
    const candidates = new Map<LandingRowKind, string[] | null>(
      eventRows.map((row, index) => [row.kind, eventIds[index]]),
    );
    groupRows.forEach((kind, index) => {
      const list = groupLists[index];
      if (list === undefined) return;
      list?.forEach((group) => groupsById.set(group.id, group));
      candidates.set(kind, list?.map((group) => group.id) ?? null);
    });
    const picked = pickRows(order, candidates);

    const pickedEventIds = [
      ...new Set(
        picked.flatMap((row) =>
          row.status === 'ok' && !isGroupRow(row.kind) ? row.ids : [],
        ),
      ),
    ];
    const topRow = picked.find((row) => row.kind === 'top');
    const topIds = topRow?.status === 'ok' ? topRow.ids : [];
    const eventsById = await this.landingEvents(pickedEventIds, topIds, viewer);

    return {
      rows: picked.map((row) =>
        row.status === 'error'
          ? { kind: row.kind, status: 'error', events: [], groups: [] }
          : {
              kind: row.kind,
              status: 'ok',
              events: isGroupRow(row.kind)
                ? []
                : row.ids.flatMap((id) => eventsById.get(id) ?? []),
              groups: isGroupRow(row.kind)
                ? row.ids.flatMap((id) => groupsById.get(id) ?? [])
                : [],
            },
      ),
      near,
      cities,
      interestActivityIds:
        viewer?.profile.interests.map((interest) => interest.activity.id) ?? [],
    };
  }

  private async viewerOf(identity: Identity): Promise<Viewer> {
    const [profile, friends] = await Promise.all([
      this.onboarding.getOnboardingOf(identity.id),
      this.friendships.listFriendsSharingUpcomingEvents(identity.id),
    ]);
    return { identity, profile, friends };
  }

  // A group row's candidates; undefined when the row does not apply to the
  // viewer, null when its query failed.
  private async groupsOf(
    kind: LandingGroupRow,
    viewer: Viewer | undefined,
    limit: number,
    now: Date,
  ): Promise<LandingGroup[] | null | undefined> {
    const withoutRecent = (group: Group): LandingGroup => ({
      ...group,
      recentMemberCount: null,
    });
    try {
      if (kind === 'trendingGroups') {
        return await this.groups.listTrendingGroups(
          viewer?.identity,
          trendingSince(now),
          limit,
        );
      }
      const activityIds =
        viewer?.profile.interests.map((interest) => interest.activity.id) ?? [];
      if (!viewer || activityIds.length === 0) return undefined;
      const groups = await this.groups.listGroupsForActivities(
        viewer.identity,
        activityIds,
        limit,
      );
      return groups.map(withoutRecent);
    } catch {
      return null;
    }
  }

  // The cards of the picked events, with what the viewer adds to them: their
  // own state, the friends going who allowed it, and on "Top akce" the
  // organizer's public score.
  private async landingEvents(
    ids: string[],
    topIds: string[],
    viewer: Viewer | undefined,
  ): Promise<Map<string, LandingEvent>> {
    const friendIds = viewer?.friends.map((friend) => friend.id) ?? [];
    const [items, states, attendees, organizers] = await Promise.all([
      this.events.getListItemsByIds(ids),
      viewer
        ? this.events.getViewerStates(ids, viewer.identity.id)
        : Promise.resolve(new Map<string, never>()),
      this.events.getAttendees(ids, friendIds),
      viewer && topIds.length > 0
        ? this.events.getOrganizerIds(topIds)
        : Promise.resolve(new Map<string, string>()),
    ]);
    const scores = await this.ratings.getPublicOrganizerScores([
      ...new Set(organizers.values()),
    ]);
    const friendById = new Map(
      (viewer?.friends ?? []).map((friend) => [friend.id, friend]),
    );
    const friendsOf = (eventId: string): LandingFriend[] =>
      attendees.flatMap((attendee) =>
        attendee.eventId === eventId
          ? (friendById.get(attendee.userId) ?? [])
          : [],
      );
    return new Map(
      items.map((item: EventListItem): [string, LandingEvent] => {
        const organizerId = organizers.get(item.id);
        return [
          item.id,
          {
            ...item,
            viewerState: states.get(item.id) ?? null,
            friends: friendsOf(item.id),
            organizerScore: organizerId
              ? (scores.get(organizerId) ?? null)
              : null,
          },
        ];
      }),
    );
  }
}
