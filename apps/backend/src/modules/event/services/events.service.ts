import { EventListPage, Page } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  getUpcomingPublicEvents(
    page: Page,
    now: Date = new Date(),
  ): Promise<EventListPage> {
    return this.eventRepository.getUpcomingPublicEvents(now, page);
  }
}
