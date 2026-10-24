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
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_FINISHED: 'The event is over',
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

  // F-06.1. With manual approval a new request waits for the organizer
  // (F-05.7); with automatic approval (F-05.5) it is approved at once and takes
  // the seat. The waitlist (F-05.9) comes later.
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
    if (event.approvalMode === 'AUTOMATIC') {
      const approved = await this.repository.createApproved({
        eventId,
        userId: user.id,
        message,
        at: now,
      });
      if (typeof approved === 'string') throw violationsError([approved]);
      return approved;
    }
    const request = await this.repository.createPending({
      eventId,
      userId: user.id,
      message,
    });
    if (!request) throw violationsError(['ALREADY_REQUESTED']);
    return request;
  }

  // Needs no look at the event: a pending request can be taken back even once
  // the event stops being public.
  async withdrawMyRequest(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<void> {
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
