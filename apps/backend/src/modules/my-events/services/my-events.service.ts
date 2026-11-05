import { EventListPage, Page } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import {
  applicationStatusOf,
  MyApplication,
  MyApplicationPage,
} from '@/modules/my-events/domain/my-events';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyEventsService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly requestsService: ParticipationRequestsService,
  ) {}

  // One page of the person's applications, soonest event first.
  async getApplications(
    user: Identity,
    page: Page,
    now: Date = new Date(),
  ): Promise<MyApplicationPage> {
    const { items: facts, total } =
      await this.requestsService.getMyApplicationFacts(user, page, now);
    const events = await this.eventsService.getListItemsByIds(
      facts.map((entry) => entry.eventId),
    );
    const byId = new Map(events.map((event) => [event.id, event]));
    const items = facts.flatMap(({ eventId, ...rest }): MyApplication[] => {
      const event = byId.get(eventId);
      const status = applicationStatusOf(rest);
      return event && status ? [{ status, event }] : [];
    });
    return { items, total };
  }

  getHosted(
    user: Identity,
    page: Page,
    now: Date = new Date(),
  ): Promise<EventListPage> {
    return this.eventsService.getUpcomingOrganizedEvents(user, page, now);
  }
}
