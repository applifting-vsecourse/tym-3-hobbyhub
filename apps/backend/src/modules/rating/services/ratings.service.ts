import {
  EventRatingState,
  GivenRatingPage,
  isAnyOrganizerOf,
  isRateableSeat,
  organizerRatingViolations,
  Page,
  participantRatingViolations,
  Rating,
  ratingDeadlineOf,
  RatingDirection,
  RatingEventFacts,
  ratingEventViolations,
  RatingScore,
  RatingTarget,
  RatingViolation,
  ReceivedRatingPage,
  SeatStatus,
  UserRatingScores,
} from '@/modules/rating/domain/rating';
import { RatingRepository } from '@/modules/rating/repositories/rating.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<RatingViolation, string> = {
  EVENT_NOT_OVER: 'The event is not over yet',
  RATING_CLOSED: 'The time to rate this event is over',
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_HIDDEN: 'The event was hidden by an administrator',
  IS_ORGANIZER: 'Organizers do not rate their own event',
  NOT_MAIN_ORGANIZER: 'Only the main organizer rates the participants',
  PARTICIPANT_IS_ORGANIZER:
    'Organizers of the event are not rated as participants',
  NO_SEAT:
    'Only someone with a seat at the end of the event takes part in ratings',
  ALREADY_RATED: 'This rating has already been given',
};

// English messages plus the codes, so the client can say why in its language.
const violationsError = (violations: RatingViolation[]): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
    violations,
  });

export type RatingInput = { stars: number; comment?: string };

// #236, ADR-0027: ratings after an event. A participant rates the main
// organizer, the main organizer rates the participants; nobody sees a rating
// about them until the rating period is over. The form and the prompts to
// rate are #234 and #235.
@Injectable()
export class RatingsService {
  constructor(
    private readonly repository: RatingRepository,
    private readonly blocks: UserBlockVisibility,
  ) {}

  /** A person's scores as the views compute them; who sees what is the caller's. */
  getUserScores(userId: string): Promise<UserRatingScores> {
    return this.repository.getUserScores(userId);
  }

  /**
   * #215: the organizer scores others may see (from three revealed ratings);
   * whether this viewer may see them at all is the caller's.
   */
  getPublicOrganizerScores(
    userIds: string[],
  ): Promise<Map<string, RatingScore>> {
    return this.repository.getPublicOrganizerScores(userIds);
  }

  /** The score of an event from its participants' ratings. */
  getEventScore(eventId: string): Promise<RatingScore> {
    return this.repository.getEventScore(eventId);
  }

  /**
   * Who the signed-in person may rate at the event, what they gave and until
   * when. The event does not exist for someone who neither had a seat nor
   * runs it.
   */
  async getEventRatingState(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventRatingState> {
    const { event, seat } = await this.getRatingEvent(eventId, user.id);
    const given = await this.repository.getRatingsByAuthorAt(eventId, user.id);
    const givenTo = (
      participantId: string,
      direction: RatingDirection,
    ): Rating | null =>
      given.find(
        (rating) =>
          rating.participantId === participantId &&
          rating.direction === direction,
      ) ?? null;

    let organizer: RatingTarget | null = null;
    if (!isAnyOrganizerOf(event, user.id) && isRateableSeat(seat)) {
      const rating = givenTo(user.id, 'TO_ORGANIZER');
      organizer = {
        user: { id: event.organizerId, name: event.organizerName },
        rating,
        violations: organizerRatingViolations({
          event,
          authorId: user.id,
          authorSeat: seat,
          alreadyRated: rating !== null,
          now,
        }),
      };
    }

    let participants: RatingTarget[] = [];
    if (event.organizerId === user.id) {
      const hidden = await this.blocks.hiddenFor(user.id);
      const people = await this.repository.getRateableParticipants(eventId, [
        event.organizerId,
        ...event.coOrganizerIds,
        ...hidden,
      ]);
      participants = people.map(({ seat: participantSeat, ...person }) => {
        const rating = givenTo(person.id, 'TO_PARTICIPANT');
        return {
          user: person,
          rating,
          violations: participantRatingViolations({
            event,
            authorId: user.id,
            participantId: person.id,
            participantSeat,
            alreadyRated: rating !== null,
            now,
          }),
        };
      });
    }

    return {
      event: { id: event.id, title: event.title },
      deadline: ratingDeadlineOf(event.endAt),
      organizer,
      participants,
    };
  }

  /**
   * #234: which of these events the person may rate the organizer of right
   * now, by the same rules as the rating itself. For lists that point to the
   * rating page (the overview of one's applications), in a fixed number of
   * queries whatever the length of the list.
   */
  async getEventsToRateOrganizer(
    user: Identity,
    eventIds: readonly string[],
    now: Date = new Date(),
  ): Promise<string[]> {
    if (eventIds.length === 0) return [];
    const [events, seats, rated, hidden] = await Promise.all([
      this.repository.getEventFactsOf(eventIds),
      this.repository.getSeatStatuses(user.id, eventIds),
      this.repository.getOrganizerRatedEventIds(user.id, eventIds),
      this.blocks.hiddenFor(user.id),
    ]);
    return events
      .filter((event) => {
        // Blocked from an organizer, the event does not exist for them.
        const organizerIds = [event.organizerId, ...event.coOrganizerIds];
        if (organizerIds.some((id) => hidden.includes(id))) return false;
        return (
          organizerRatingViolations({
            event,
            authorId: user.id,
            authorSeat: seats.get(event.id) ?? null,
            alreadyRated: rated.includes(event.id),
            now,
          }).length === 0
        );
      })
      .map(({ id }) => id);
  }

  /**
   * #235: how many participants the main organizer may still rate at each of
   * these events, by the same rules as the rating itself; events with nobody
   * left are not in the map. Only ever about the person asking: nobody else
   * learns who rated whom. In a fixed number of queries whatever the length of
   * the list.
   */
  async getParticipantsToRate(
    user: Identity,
    eventIds: readonly string[],
    now: Date = new Date(),
  ): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const events = (await this.repository.getEventFactsOf(eventIds)).filter(
      (event) =>
        event.organizerId === user.id &&
        ratingEventViolations(event, now).length === 0,
    );
    if (events.length === 0) return new Map();

    const ids = events.map(({ id }) => id);
    const [seats, rated, hidden] = await Promise.all([
      this.repository.getRateableSeatsAt(ids),
      this.repository.getParticipantsRatedBy(user.id, ids),
      this.blocks.hiddenFor(user.id),
    ]);
    const isRated = (eventId: string, participantId: string): boolean =>
      rated.some(
        (rating) =>
          rating.eventId === eventId && rating.participantId === participantId,
      );
    return new Map(
      events.flatMap((event): [string, number][] => {
        const left = seats.filter(
          (seat) =>
            seat.eventId === event.id &&
            !hidden.includes(seat.userId) &&
            participantRatingViolations({
              event,
              authorId: user.id,
              participantId: seat.userId,
              participantSeat: seat.status,
              alreadyRated: isRated(event.id, seat.userId),
              now,
            }).length === 0,
        ).length;
        return left > 0 ? [[event.id, left]] : [];
      }),
    );
  }

  /** A participant rates the main organizer of the event. */
  async rateOrganizer(
    user: Identity,
    eventId: string,
    input: RatingInput,
    now: Date = new Date(),
  ): Promise<Rating> {
    const { event, seat } = await this.getRatingEvent(eventId, user.id);
    const existing = await this.repository.findRating(
      eventId,
      user.id,
      'TO_ORGANIZER',
    );
    const violations = organizerRatingViolations({
      event,
      authorId: user.id,
      authorSeat: seat,
      alreadyRated: existing !== null,
      now,
    });
    if (violations.length > 0) throw violationsError(violations);

    // Who rates comes from the session, the rated one from the event.
    const rating = await this.repository.create({
      eventId,
      participantId: user.id,
      direction: 'TO_ORGANIZER',
      authorId: user.id,
      ratedUserId: event.organizerId,
      stars: input.stars,
      comment: input.comment ?? null,
    });
    if (!rating) throw violationsError(['ALREADY_RATED']);
    return rating;
  }

  /**
   * The main organizer rates one participant. To someone who does not run the
   * event, it does not exist; a participant blocked from the organizer, or
   * without any seat, is not found.
   */
  async rateParticipant(
    user: Identity,
    eventId: string,
    participantId: string,
    input: RatingInput,
    now: Date = new Date(),
  ): Promise<Rating> {
    const event = await this.getEventOf(eventId);
    if (!isAnyOrganizerOf(event, user.id)) throw eventNotFound();

    const hidden = await this.blocks.hiddenFor(user.id);
    const participantSeat = hidden.includes(participantId)
      ? null
      : await this.repository.getSeatStatus(eventId, participantId);
    if (participantSeat === null && !isAnyOrganizerOf(event, participantId)) {
      throw new NotFoundException('Participant not found');
    }

    const existing = await this.repository.findRating(
      eventId,
      participantId,
      'TO_PARTICIPANT',
    );
    const violations = participantRatingViolations({
      event,
      authorId: user.id,
      participantId,
      participantSeat,
      alreadyRated: existing !== null,
      now,
    });
    if (violations.length > 0) throw violationsError(violations);

    const rating = await this.repository.create({
      eventId,
      participantId,
      direction: 'TO_PARTICIPANT',
      authorId: user.id,
      ratedUserId: participantId,
      stars: input.stars,
      comment: input.comment ?? null,
    });
    if (!rating) throw violationsError(['ALREADY_RATED']);
    return rating;
  }

  /**
   * "Moje hodnocení": the revealed ratings the person received one way. The
   * view already leaves out those of anyone blocked from them (ADR-0022).
   */
  getReceived(
    user: Identity,
    direction: RatingDirection,
    page: Page,
  ): Promise<ReceivedRatingPage> {
    return this.repository.getReceived(user.id, direction, page);
  }

  /** The ratings the person gave, and whether the rated one sees them yet. */
  async getGiven(
    user: Identity,
    page: Page,
    now: Date = new Date(),
  ): Promise<GivenRatingPage> {
    return this.repository.getGiven(
      user.id,
      page,
      await this.blocks.hiddenFor(user.id),
      now,
    );
  }

  private async getEventOf(eventId: string): Promise<RatingEventFacts> {
    const event = await this.repository.getEventFacts(eventId);
    if (!event) throw eventNotFound();
    return event;
  }

  /**
   * The event as the person rating sees it, with their seat. It exists for
   * its organizers, and for whoever had any seat on it, unless an
   * administrator hid it or blocked them from its organizer (ADR-0022): then
   * it does not exist for them, the same 404 as the detail.
   */
  private async getRatingEvent(
    eventId: string,
    userId: string,
  ): Promise<{ event: RatingEventFacts; seat: SeatStatus | null }> {
    const event = await this.getEventOf(eventId);
    if (isAnyOrganizerOf(event, userId)) {
      return {
        event,
        seat: await this.repository.getSeatStatus(eventId, userId),
      };
    }
    const seat = await this.repository.getSeatStatus(eventId, userId);
    if (seat === null || event.isHidden) throw eventNotFound();
    const hidden = await this.blocks.hiddenFor(userId);
    const organizerIds = [event.organizerId, ...event.coOrganizerIds];
    if (organizerIds.some((id) => hidden.includes(id))) throw eventNotFound();
    return { event, seat };
  }
}

const eventNotFound = (): NotFoundException =>
  new NotFoundException('Event not found');
