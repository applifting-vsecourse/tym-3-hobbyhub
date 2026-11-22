import { interestedEventStateOf } from '@/modules/event-interest/domain/event-interest';
import { EventInterestsService } from '@/modules/event-interest/services/event-interests.service';
import {
  EventFilter,
  eventListFilterViolations,
  Page,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import {
  applicationStatusOf,
  MyApplication,
  MyApplicationPage,
  MyHostedEventPage,
  MyInterestedEvent,
  MyInterestedEventPage,
} from '@/modules/my-events/domain/my-events';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, Injectable } from '@nestjs/common';

// The same rule between fields as the public list (#177).
const assertValidFilter = (filter: EventFilter): void => {
  if (eventListFilterViolations(filter).length > 0) {
    throw new BadRequestException('dateFrom must not be after dateTo');
  }
};

@Injectable()
export class MyEventsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly requestsService: ParticipationRequestsService,
    private readonly ratingsService: RatingsService,
    private readonly interestsService: EventInterestsService,
  ) {}

  // One page of the person's applications: waiting and approved ones to
  // events still on first, soonest first; then the rest, latest first.
  async getApplications(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<MyApplicationPage> {
    assertValidFilter(filter);
    const { items: facts, total } =
      await this.requestsService.getMyApplicationFacts(user, page, filter, now);
    const eventIds = facts.map((entry) => entry.eventId);
    // #234: the rating rules decide who may still rate, not this overview.
    const [events, toRate] = await Promise.all([
      this.eventsService.getListItemsByIds(eventIds),
      this.ratingsService.getEventsToRateOrganizer(user, eventIds, now),
    ]);
    const byId = new Map(events.map((event) => [event.id, event]));
    const items = facts.flatMap(({ eventId, ...rest }): MyApplication[] => {
      const event = byId.get(eventId);
      const status = applicationStatusOf(rest);
      return event && status
        ? [{ status, event, canRateOrganizer: toRate.includes(eventId) }]
        : [];
    });
    const next = page.offset + facts.length;
    return { items, total, nextOffset: next < total ? next : null };
  }

  // One page of the events the person organizes: the ones still on first,
  // soonest first; then the ones that are over, latest first.
  async getHosted(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<MyHostedEventPage> {
    assertValidFilter(filter);
    const { items, total } = await this.eventsService.getOrganizedEvents(
      user,
      page,
      filter,
      now,
    );
    // #235: the rating rules decide whom the organizer may still rate.
    const toRate = await this.ratingsService.getParticipantsToRate(
      user,
      items.map(({ id }) => id),
      now,
    );
    return {
      items: items.map((event) => ({
        ...event,
        participantsToRate: toRate.get(event.id) ?? 0,
      })),
      total,
    };
  }

  // #231: one page of the person's "Zajímá mě" list: what is still on first,
  // soonest first; then what is over or was called off, latest first. Only
  // events they may still see, which `total` counts too.
  async getInterested(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<MyInterestedEventPage> {
    assertValidFilter(filter);
    const { items: rows, total } = await this.interestsService.getMyPage(
      user,
      page,
      filter,
      now,
    );
    const events = await this.eventsService.getListItemsByIds(
      rows.map((row) => row.eventId),
    );
    const byId = new Map(events.map((event) => [event.id, event]));
    // #232: only a full event still ahead can be watched, so only those are
    // asked about (each look reads visibility, blocks and requests); the rules
    // decide the rest.
    const watchable = await this.interestsService.getWatchableEventIds(
      user,
      events
        .filter(
          (event) =>
            event.startAt.getTime() > now.getTime() &&
            event.takenCount >= event.maxParticipants,
        )
        .map((event) => event.id),
      now,
    );
    // The person's own application to each saved event, as under "Přihlášky":
    // the list keeps an event they signed up for, so the row has to say so.
    const facts = await this.requestsService.getMyApplicationFactsOf(
      user,
      events.map((event) => event.id),
    );
    const statusById = new Map(
      facts.map(({ eventId, ...rest }) => [eventId, applicationStatusOf(rest)]),
    );
    return {
      items: rows.flatMap(
        ({ eventId, status, watchesFreeSpot }): MyInterestedEvent[] => {
          const event = byId.get(eventId);
          return event
            ? [
                {
                  ...event,
                  state: interestedEventStateOf(
                    { status, endAt: event.endAt },
                    now,
                  ),
                  watchesFreeSpot,
                  canWatchFreeSpot: watchable.has(eventId),
                  applicationStatus: statusById.get(eventId) ?? null,
                },
              ]
            : [];
        },
      ),
      total,
    };
  }
}
