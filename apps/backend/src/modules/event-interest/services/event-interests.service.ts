import {
  EventInterestPage,
  EventInterestState,
  InterestRuleViolation,
  interestRuleViolations,
} from '@/modules/event-interest/domain/event-interest';
import { EventInterestRepository } from '@/modules/event-interest/repositories/event-interest.repository';
import {
  EventFilter,
  EventSeatFacts,
  Page,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<InterestRuleViolation, string> = {
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_FINISHED: 'The event is over',
  EVENT_STARTED: 'The event has already started',
  IS_ORGANIZER: 'The organizer cannot save their own event',
};

// Messages plus the codes, so the client can say why in its language.
const violationsError = (
  violations: InterestRuleViolation[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
    violations,
  });

// #231, ADR-0030: the signed-in person's "Zajímá mě" list. Only ever about the
// person asking: nothing here tells anyone who else saved an event, or how
// many did.
@Injectable()
export class EventInterestsService {
  constructor(
    private readonly repository: EventInterestRepository,
    private readonly eventsService: EventsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  // For the detail: whether the event is on the list and whether it may be
  // saved now. An event the person may not see does not exist, as on the
  // detail.
  async getState(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventInterestState> {
    const event = await this.getVisibleEvent(user, eventId);
    return {
      isSaved: await this.repository.isSaved(user.id, eventId),
      violations: interestRuleViolations(event, user.id, now),
    };
  }

  // Saving twice keeps one row (a double tap, two windows).
  async save(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventInterestState> {
    const event = await this.getVisibleEvent(user, eventId);
    const violations = interestRuleViolations(event, user.id, now);
    if (violations.length > 0) throw violationsError(violations);
    await this.repository.save(user.id, eventId);
    return { isSaved: true, violations };
  }

  // Always allowed, whatever happened to the event since, and quiet when it
  // was not on the list: it says nothing about an event the person may not
  // see.
  async remove(user: Identity, eventId: string): Promise<void> {
    await this.repository.remove(user.id, eventId);
  }

  // A page of the list for "Moje akce". The caller has checked the filter.
  async getMyPage(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<EventInterestPage> {
    return this.repository.getPage(user.id, now, page, {
      ...filter,
      // #239: an event of someone blocked from them is not on the list.
      hiddenOrganizerIds: await this.blocks.hiddenFor(user.id),
    });
  }

  private async getVisibleEvent(
    user: Identity,
    eventId: string,
  ): Promise<EventSeatFacts> {
    const event = await this.eventsService.getVisibleEventSeatFacts(
      eventId,
      user.id,
    );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
