import {
  EventFacts,
  EventFilter,
  EventSeatFacts,
  Page,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import {
  ApplicantProfile,
  ApplicationFactsPage,
  CancelRuleViolation,
  cancelRuleViolations,
  currentRequestOf,
  DecidedRequestPage,
  DecidedStatus,
  DecisionRuleViolation,
  decisionRuleViolations,
  JoinRuleViolation,
  joinRuleViolations,
  ParticipantPage,
  ParticipationRequest,
  PendingRequestPage,
  SeatStatus,
} from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestRepository } from '@/modules/participation-request/repositories/participation-request.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type Violation =
  JoinRuleViolation | DecisionRuleViolation | CancelRuleViolation;

const VIOLATION_MESSAGES: Record<Violation, string> = {
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_FINISHED: 'The event is over',
  EVENT_STARTED: 'The event has already started',
  EVENT_FULL: 'The event is full',
  IS_ORGANIZER: 'The organizer cannot ask to join their own event',
  HAS_SEAT: 'You already have a seat at this event',
  ALREADY_REQUESTED: 'You have already asked to join this event',
  REJECTED_BEFORE: 'Your request to join this event was rejected',
  NOT_PENDING: 'The request no longer waits for a decision',
  APPLICANT_HAS_SEAT: 'The applicant already has a seat at this event',
  NO_SEAT: 'You have no seat at this event to cancel',
};

// Event messages plus the codes, so the client can say why in its language.
const violationsError = (violations: Violation[]): BadRequestException =>
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
  // Their seat, if they ever had one: an approved request with a CANCELLED
  // seat is a person who cancelled it (F-06.4, ADR-0017).
  seat: SeatStatus | null;
  // Empty when they may cancel their seat now.
  cancelViolations: CancelRuleViolation[];
  // What the organizer sees of them (F-05.7), so the request form can show it.
  applicant: ApplicantProfile;
};

@Injectable()
export class ParticipationRequestsService {
  constructor(
    private readonly repository: ParticipationRequestRepository,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // F-06.3, #177: a page of the person's own applications, the ones still on
  // first; the overview turns them into one status per event. The caller has
  // checked the filter.
  getMyApplicationFacts(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<ApplicationFactsPage> {
    return this.repository.getApplicationFacts(user.id, now, page, filter);
  }

  async getMyRequestState(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<MyRequestState> {
    const event = await this.getEvent(eventId, user);
    const [requests, seat, applicant] = await Promise.all([
      this.repository.getRequestsOf(eventId, user.id),
      this.repository.getSeatStatus(eventId, user.id),
      this.repository.getApplicantProfile(user.id),
    ]);
    return {
      request: currentRequestOf(requests),
      violations: joinRuleViolations(event, user.id, requests, now),
      seat,
      cancelViolations: cancelRuleViolations(event, now),
      applicant,
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
    // F-03.2 (#13): asking to join deliberately needs no verified e-mail, to
    // keep the friction for participants low; the organizer sees the status.
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
      at: now,
    });
    if (typeof request === 'string') throw violationsError([request]);
    if (!request) throw violationsError(['ALREADY_REQUESTED']);
    // F-09.2: the organizers have a decision to make (ADR-0015). A seat taken
    // at once (automatic approval) is no request to decide, so it is not one.
    await this.notificationsService.notifyNewParticipationRequest({
      event,
      applicant: user,
    });
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

  // F-06.4: the participant gives their seat back any time before the start,
  // and tells the organizers why. The seat frees up for anyone who asks next;
  // offering it to the waitlist is F-05.9.
  async cancelMySeat(
    user: Identity,
    eventId: string,
    message: string,
    now: Date = new Date(),
  ): Promise<void> {
    const event = await this.getEvent(eventId, user);
    const violations = cancelRuleViolations(event, now);
    if (violations.length > 0) throw violationsError(violations);

    // Who cancels comes from the session, never from the request body.
    const refusal = await this.repository.cancelSeat({
      eventId,
      userId: user.id,
      message,
      at: now,
    });
    if (refusal) throw violationsError([refusal]);
    await this.notificationsService.notifyParticipantCancelled({
      event,
      participant: user,
      message,
    });
  }

  // F-05.7: the requests waiting on the event, for its organizers.
  async getPendingRequests(
    user: Identity,
    eventId: string,
    page: Page,
  ): Promise<PendingRequestPage> {
    await this.eventsService.getOrganizedEvent(eventId, user);
    return this.repository.getPendingRequests(eventId, page);
  }

  // F-05.6, F-06.4: who has a seat and who gave it back, for the event's
  // organizers.
  async getParticipants(
    user: Identity,
    eventId: string,
    status: SeatStatus,
    page: Page,
  ): Promise<ParticipantPage> {
    await this.eventsService.getOrganizedEvent(eventId, user);
    return this.repository.getParticipants(eventId, status, page);
  }

  // F-05.6: the rejected and withdrawn requests, for the event's organizers.
  async getDecidedRequests(
    user: Identity,
    eventId: string,
    status: DecidedStatus,
    page: Page,
  ): Promise<DecidedRequestPage> {
    await this.eventsService.getOrganizedEvent(eventId, user);
    return this.repository.getDecidedRequests(eventId, status, page);
  }

  // F-05.7. Approval takes a seat, so the repository checks the seats again
  // under a lock: the read here cannot see another organizer approving at the
  // same moment.
  async approveRequest(
    user: Identity,
    eventId: string,
    requestId: string,
    now: Date = new Date(),
  ): Promise<ParticipationRequest> {
    const { event, request } = await this.getDecidable(
      user,
      eventId,
      requestId,
    );
    const violations = decisionRuleViolations(event, request, 'APPROVE', now);
    if (violations.length > 0) throw violationsError(violations);

    const approved = await this.repository.approvePending({
      eventId,
      requestId,
      at: now,
    });
    if (typeof approved === 'string') throw violationsError([approved]);
    await this.notificationsService.notifyParticipationRequestDecided({
      event,
      request: approved,
      decision: 'APPROVED',
      decidedBy: user,
    });
    return approved;
  }

  // F-05.7. Final for the event (ADR-0013); the reason is kept, not shown.
  async rejectRequest(
    user: Identity,
    eventId: string,
    requestId: string,
    reason?: string,
    now: Date = new Date(),
  ): Promise<ParticipationRequest> {
    const { event, request } = await this.getDecidable(
      user,
      eventId,
      requestId,
    );
    const violations = decisionRuleViolations(event, request, 'REJECT', now);
    if (violations.length > 0) throw violationsError(violations);

    const rejected = await this.repository.rejectPending({
      eventId,
      requestId,
      reason,
      at: now,
    });
    if (!rejected) throw violationsError(['NOT_PENDING']);
    await this.notificationsService.notifyParticipationRequestDecided({
      event,
      request: rejected,
      decision: 'REJECTED',
      decidedBy: user,
    });
    return rejected;
  }

  private async getDecidable(
    user: Identity,
    eventId: string,
    requestId: string,
  ): Promise<{ event: EventFacts; request: ParticipationRequest }> {
    // The event module decides who organizes it, and answers 404 to the rest.
    const event = await this.eventsService.getOrganizedEvent(eventId, user);
    const request = await this.repository.getRequest(eventId, requestId);
    if (!request) throw new NotFoundException('Request not found');
    return { event, request };
  }

  private async getEvent(
    eventId: string,
    user: Identity,
  ): Promise<EventSeatFacts> {
    const event = await this.eventsService.getVisibleEventSeatFacts(
      eventId,
      user.id,
    );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
