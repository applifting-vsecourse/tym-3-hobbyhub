import { EventSeatFacts } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import {
  currentRequestOf,
  JoinRuleViolation,
  joinRuleViolations,
  ParticipationRequest,
} from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestRepository } from '@/modules/participation-request/repositories/participation-request.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<JoinRuleViolation, string> = {
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_STARTED: 'The event has already started',
  EVENT_FULL: 'The event is full',
  IS_ORGANIZER: 'The organizer cannot ask to join their own event',
  HAS_SEAT: 'You already have a seat at this event',
  ALREADY_REQUESTED: 'You have already asked to join this event',
  REJECTED_BEFORE: 'Your request to join this event was rejected',
};

// Event messages plus the codes, so the client can say why in its language.
const violationsError = (
  violations: JoinRuleViolation[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
    violations,
  });

// What the signed-in person sees in the seat panel of an event.
export type MyRequestState = {
  request: ParticipationRequest | null;
  // Empty when they may ask to join now.
  violations: JoinRuleViolation[];
};

@Injectable()
export class ParticipationRequestsService {
  constructor(
    private readonly repository: ParticipationRequestRepository,
    private readonly eventsService: EventsService,
  ) {}

  async getMyRequestState(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<MyRequestState> {
    const event = await this.getEvent(eventId, user);
    const requests = await this.repository.getRequestsOf(eventId, user.id);
    return {
      request: currentRequestOf(requests),
      violations: joinRuleViolations(event, user.id, requests, now),
    };
  }

  // F-06.1. A new request waits for the organizer (F-05.7); automatic
  // approval (F-05.5) and the waitlist (F-05.9) come later.
  async requestToJoin(
    user: Identity,
    eventId: string,
    message?: string,
    now: Date = new Date(),
  ): Promise<ParticipationRequest> {
    const event = await this.getEvent(eventId, user);
    // TODO(F-03.2 #13): a verified e-mail becomes a condition here.
    const requests = await this.repository.getRequestsOf(eventId, user.id);
    const violations = joinRuleViolations(event, user.id, requests, now);
    if (violations.length > 0) throw violationsError(violations);

    // The applicant comes from the session, never from the request body.
    const request = await this.repository.createPending({
      eventId,
      userId: user.id,
      message,
    });
    if (!request) throw violationsError(['ALREADY_REQUESTED']);
    return request;
  }

  async withdrawMyRequest(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<void> {
    await this.getEvent(eventId, user);
    const withdrawn = await this.repository.withdrawPending(
      eventId,
      user.id,
      now,
    );
    if (!withdrawn)
      throw new NotFoundException('No pending request to withdraw');
  }

  private async getEvent(
    eventId: string,
    user: Identity,
  ): Promise<EventSeatFacts> {
    const event = await this.eventsService.getPublicEventSeatFacts(
      eventId,
      user.id,
    );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
