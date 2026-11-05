import { EventsService } from '@/modules/event/services/events.service';
import {
  applicationStatusOf,
  MyApplication,
  MyEventsOverview,
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

  async getOverview(
    user: Identity,
    now: Date = new Date(),
  ): Promise<MyEventsOverview> {
    const [facts, hosted] = await Promise.all([
      this.requestsService.getMyApplicationFacts(user, now),
      this.eventsService.getUpcomingOrganizedEvents(user, now),
    ]);
    const statuses = facts.flatMap(({ eventId, ...rest }) => {
      const status = applicationStatusOf(rest);
      return status ? [{ eventId, status }] : [];
    });
    const events = await this.eventsService.getListItemsByIds(
      statuses.map((entry) => entry.eventId),
    );
    const byId = new Map(events.map((event) => [event.id, event]));
    const applications = statuses
      .flatMap(({ eventId, status }): MyApplication[] => {
        const event = byId.get(eventId);
        return event ? [{ status, event }] : [];
      })
      .sort(
        (a, b) =>
          a.event.startAt.getTime() - b.event.startAt.getTime() ||
          a.event.id.localeCompare(b.event.id),
      );
    return { applications, hosted };
  }
}
