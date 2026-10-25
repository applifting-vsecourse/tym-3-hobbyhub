import { ActivitiesService } from '@/modules/activity/services/activities.service';
import {
  CreateEventData,
  Event,
  EventDetail,
  EventFacts,
  EventListFilter,
  EventListPage,
  EventRuleViolation,
  eventRuleViolations,
  EventSeatFacts,
  isOrganizerOf,
  Page,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<EventRuleViolation, string> = {
  START_NOT_IN_FUTURE: 'startAt must be in the future',
  END_NOT_AFTER_START: 'endAt must be after startAt',
  MIN_ABOVE_MAX: 'minParticipants must not exceed maxParticipants',
  OCCUPIED_ABOVE_MAX: 'externalOccupiedSpots must not exceed maxParticipants',
  NOTE_WITHOUT_AMOUNT: 'contributionNote requires contributionAmount',
  POSITION_INCOMPLETE:
    'location.latitude and location.longitude must be sent together',
};

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async createEvent(user: Identity, data: CreateEventData): Promise<Event> {
    const now = new Date();
    const violations = eventRuleViolations(data, now);
    if (violations.length > 0) {
      // Same shape as class-validator's errors, so the client reads both alike.
      throw new BadRequestException(
        violations.map((violation) => VIOLATION_MESSAGES[violation]),
      );
    }
    if (!(await this.activitiesService.isAvailable(data.activityId))) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    return this.eventRepository.createPublishedEvent({
      ...data,
      // F-05.1: the organizer is whoever is signed in, never the request body.
      organizerId: user.id,
      publishedAt: now,
    });
  }

  async getEvent(id: string): Promise<Event> {
    const event = await this.eventRepository.getEventById(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  getUpcomingPublicEvents(
    page: Page,
    filter: EventListFilter = { activityIds: [] },
    now: Date = new Date(),
  ): Promise<EventListPage> {
    return this.eventRepository.getUpcomingPublicEvents(now, page, filter);
  }

  // Public: what a visitor may see, nothing of the organizer's private data.
  async getPublicEvent(id: string): Promise<EventDetail> {
    const event = await this.eventRepository.getPublicEventById(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  // F-06.1: null when there is no such public event.
  getPublicEventSeatFacts(
    id: string,
    userId: string,
  ): Promise<EventSeatFacts | null> {
    return this.eventRepository.getPublicEventSeatFacts(id, userId);
  }

  // The event for its organizers' own tools (requests F-05.7, participants
  // F-05.6, editing F-05.10, attendance F-05.11, waitlist F-05.9). To anyone
  // else it does not exist: the same 404 as a missing event, never a 403, so
  // nobody learns that the event, or what it holds, is there.
  async getOrganizedEvent(
    eventId: string,
    user: Identity,
  ): Promise<EventFacts> {
    const event = await this.eventRepository.getEventFacts(eventId);
    if (!event || !isOrganizerOf(event, user.id)) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }
}
