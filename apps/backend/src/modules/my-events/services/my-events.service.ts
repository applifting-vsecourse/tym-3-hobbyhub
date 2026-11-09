import {
  EventFilter,
  eventListFilterViolations,
  EventListPage,
  Page,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import {
  applicationStatusOf,
  MyApplication,
  MyApplicationPage,
} from '@/modules/my-events/domain/my-events';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
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
    const events = await this.eventsService.getListItemsByIds(
      facts.map((entry) => entry.eventId),
    );
    const byId = new Map(events.map((event) => [event.id, event]));
    const items = facts.flatMap(({ eventId, ...rest }): MyApplication[] => {
      const event = byId.get(eventId);
      const status = applicationStatusOf(rest);
      return event && status ? [{ status, event }] : [];
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
  ): Promise<EventListPage> {
    assertValidFilter(filter);
    return await this.eventsService.getOrganizedEvents(user, page, filter, now);
  }
}
