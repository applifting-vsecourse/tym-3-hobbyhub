import {
  EventRatingState,
  GivenRating,
  GivenRatingPage,
  Rating,
  RATING_DIRECTIONS,
  RatingDirection,
  RatingPerson,
  RatingScore,
  RatingTarget,
  RatingViolation,
  ReceivedRating,
  ReceivedRatingPage,
  ShownRatingScore,
  ShownUserRatingScores,
  StarDistribution,
} from '@/modules/rating/domain/rating';
import { ApiProperty } from '@nestjs/swagger';

// For the Swagger description of a refused rating.
export const RATING_VIOLATIONS: RatingViolation[] = [
  'EVENT_NOT_OVER',
  'RATING_CLOSED',
  'EVENT_CANCELLED',
  'EVENT_NOT_HELD',
  'EVENT_HIDDEN',
  'IS_ORGANIZER',
  'NOT_MAIN_ORGANIZER',
  'PARTICIPANT_IS_ORGANIZER',
  'NO_SEAT',
  'ALREADY_RATED',
];

/** A rating as its author sees it. */
export class RatingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ enum: RATING_DIRECTIONS })
  direction!: RatingDirection;

  @ApiProperty()
  ratedUserId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  stars!: number;

  @ApiProperty({ type: String, nullable: true })
  comment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromDomain(rating: Rating): RatingResponseDto {
    return {
      id: rating.id,
      eventId: rating.eventId,
      direction: rating.direction,
      ratedUserId: rating.ratedUserId,
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
    };
  }
}

/**
 * A score as the viewer may see it. Others see neither number below three
 * revealed ratings; the owner sees both.
 */
export class RatingScoreResponseDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Revealed ratings; null for others below 3, so none cannot be told from two',
  })
  count!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 4.8,
    description:
      'Plain average of the revealed ratings, unrounded; null when there is none or the viewer may not see it',
  })
  average!: number | null;

  static fromDomain(
    score: ShownRatingScore | RatingScore,
  ): RatingScoreResponseDto {
    return { count: score.count, average: score.average };
  }
}

export class UserRatingScoresResponseDto {
  @ApiProperty({ type: RatingScoreResponseDto })
  asOrganizer!: RatingScoreResponseDto;

  @ApiProperty({ type: RatingScoreResponseDto })
  asParticipant!: RatingScoreResponseDto;

  static fromDomain(
    scores: ShownUserRatingScores,
  ): UserRatingScoresResponseDto {
    return {
      asOrganizer: RatingScoreResponseDto.fromDomain(scores.asOrganizer),
      asParticipant: RatingScoreResponseDto.fromDomain(scores.asParticipant),
    };
  }
}

export class RatingPersonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The nickname' })
  name!: string;

  static fromDomain(person: RatingPerson): RatingPersonResponseDto {
    return { id: person.id, name: person.name };
  }
}

export class RatingTargetResponseDto {
  @ApiProperty({ type: RatingPersonResponseDto })
  user!: RatingPersonResponseDto;

  @ApiProperty({
    type: RatingResponseDto,
    nullable: true,
    description: 'What the signed-in person gave them, if they did',
  })
  rating!: RatingResponseDto | null;

  @ApiProperty({
    enum: RATING_VIOLATIONS,
    isArray: true,
    description: 'Empty when they may be rated now',
  })
  violations!: RatingViolation[];

  static fromDomain(target: RatingTarget): RatingTargetResponseDto {
    return {
      user: RatingPersonResponseDto.fromDomain(target.user),
      rating: target.rating
        ? RatingResponseDto.fromDomain(target.rating)
        : null,
      violations: target.violations,
    };
  }
}

class RatingEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class EventRatingStateResponseDto {
  @ApiProperty({ type: RatingEventResponseDto })
  event!: RatingEventResponseDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'The last moment to rate; then every rating of the event is revealed at once',
  })
  deadline!: Date;

  @ApiProperty({
    type: RatingTargetResponseDto,
    nullable: true,
    description: 'The main organizer, when the signed-in person had a seat',
  })
  organizer!: RatingTargetResponseDto | null;

  @ApiProperty({
    type: [RatingTargetResponseDto],
    description:
      'The participants, by name, when the signed-in person is the main organizer',
  })
  participants!: RatingTargetResponseDto[];

  static fromDomain(state: EventRatingState): EventRatingStateResponseDto {
    return {
      event: { id: state.event.id, title: state.event.title },
      deadline: state.deadline,
      organizer: state.organizer
        ? RatingTargetResponseDto.fromDomain(state.organizer)
        : null,
      participants: state.participants.map((target) =>
        RatingTargetResponseDto.fromDomain(target),
      ),
    };
  }
}

export class RatedEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class ReceivedRatingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RATING_DIRECTIONS })
  direction!: RatingDirection;

  @ApiProperty({ minimum: 1, maximum: 5 })
  stars!: number;

  @ApiProperty({ type: String, nullable: true })
  comment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: RatedEventResponseDto })
  event!: RatedEventResponseDto;

  @ApiProperty({
    type: RatingPersonResponseDto,
    nullable: true,
    description: 'Null when the author deleted their account',
  })
  author!: RatingPersonResponseDto | null;

  static fromDomain(rating: ReceivedRating): ReceivedRatingResponseDto {
    return {
      id: rating.id,
      direction: rating.direction,
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
      event: { id: rating.event.id, title: rating.event.title },
      author: rating.author
        ? RatingPersonResponseDto.fromDomain(rating.author)
        : null,
    };
  }
}

export class StarDistributionResponseDto {
  @ApiProperty({ name: '1' })
  1!: number;

  @ApiProperty({ name: '2' })
  2!: number;

  @ApiProperty({ name: '3' })
  3!: number;

  @ApiProperty({ name: '4' })
  4!: number;

  @ApiProperty({ name: '5' })
  5!: number;

  static fromDomain(
    distribution: StarDistribution,
  ): StarDistributionResponseDto {
    return { ...distribution };
  }
}

export class ReceivedRatingPageResponseDto {
  @ApiProperty({
    type: RatingScoreResponseDto,
    description: 'The owner sees the count and average even below 3 ratings',
  })
  score!: RatingScoreResponseDto;

  @ApiProperty({
    type: StarDistributionResponseDto,
    description: 'How many revealed ratings have each number of stars',
  })
  distribution!: StarDistributionResponseDto;

  @ApiProperty({ type: [ReceivedRatingResponseDto] })
  items!: ReceivedRatingResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(page: ReceivedRatingPage): ReceivedRatingPageResponseDto {
    return {
      score: RatingScoreResponseDto.fromDomain(page.score),
      distribution: StarDistributionResponseDto.fromDomain(page.distribution),
      items: page.items.map((item) =>
        ReceivedRatingResponseDto.fromDomain(item),
      ),
      total: page.total,
    };
  }
}

export class GivenRatingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RATING_DIRECTIONS })
  direction!: RatingDirection;

  @ApiProperty({ minimum: 1, maximum: 5 })
  stars!: number;

  @ApiProperty({ type: String, nullable: true })
  comment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: RatedEventResponseDto })
  event!: RatedEventResponseDto;

  @ApiProperty({ type: RatingPersonResponseDto })
  ratedUser!: RatingPersonResponseDto;

  @ApiProperty({
    description:
      'Whether the rated person already sees it (the period is over)',
  })
  isRevealed!: boolean;

  static fromDomain(rating: GivenRating): GivenRatingResponseDto {
    return {
      id: rating.id,
      direction: rating.direction,
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
      event: { id: rating.event.id, title: rating.event.title },
      ratedUser: RatingPersonResponseDto.fromDomain(rating.ratedUser),
      isRevealed: rating.isRevealed,
    };
  }
}

export class GivenRatingPageResponseDto {
  @ApiProperty({ type: [GivenRatingResponseDto] })
  items!: GivenRatingResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(page: GivenRatingPage): GivenRatingPageResponseDto {
    return {
      items: page.items.map((item) => GivenRatingResponseDto.fromDomain(item)),
      total: page.total,
    };
  }
}
