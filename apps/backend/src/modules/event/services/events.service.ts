import { EventListItem } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  getUpcomingPublicEvents(now: Date = new Date()): Promise<EventListItem[]> {
    return this.eventRepository.getUpcomingPublicEvents(now);
  }
}
