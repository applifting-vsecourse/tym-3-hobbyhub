import {
  ApplicantProfile,
  CancelRuleViolation,
  DECIDED_STATUSES,
  DecidedRequest,
  DecidedRequestPage,
  DecidedStatus,
  DecisionRuleViolation,
  JoinRuleViolation,
  Participant,
  PARTICIPANT_STATUSES,
  ParticipantPage,
  ParticipationRequest,
  PendingRequest,
  PendingRequestPage,
  RequestStatus,
  SeatStatus,
} from '@/modules/participation-request/domain/participation-request';
import { MyRequestState } from '@/modules/participation-request/services/participation-requests.service';
import { ApiProperty } from '@nestjs/swagger';

const REQUEST_STATUSES: RequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'CLOSED',
];

const JOIN_RULE_VIOLATIONS: JoinRuleViolation[] = [
  'EVENT_CANCELLED',
  'EVENT_NOT_HELD',
  'EVENT_FINISHED',
  'EVENT_STARTED',
  'EVENT_FULL',
  'IS_ORGANIZER',
  'HAS_SEAT',
  'ALREADY_REQUESTED',
  'REJECTED_BEFORE',
];

const SEAT_STATUSES: SeatStatus[] = ['APPROVED', 'CANCELLED'];

// For the Swagger description of a refused cancellation (F-06.4).
export const CANCEL_RULE_VIOLATIONS: CancelRuleViolation[] = [
  'EVENT_CANCELLED',
  'EVENT_NOT_HELD',
  'EVENT_FINISHED',
  'EVENT_STARTED',
  'NO_SEAT',
];

// For the Swagger description of a refused decision.
export const DECISION_RULE_VIOLATIONS: DecisionRuleViolation[] = [
  'EVENT_CANCELLED',
  'EVENT_NOT_HELD',
  'EVENT_FINISHED',
  'EVENT_STARTED',
  'EVENT_FULL',
  'NOT_PENDING',
  'APPLICANT_HAS_SEAT',
];

// The rejection reason stays out: nobody sees it in the app yet.
export class ParticipationRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ enum: REQUEST_STATUSES })
  status!: RequestStatus;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: Date;

  static fromDomain(
    request: ParticipationRequest,
  ): ParticipationRequestResponseDto {
    return {
      id: request.id,
      eventId: request.eventId,
      status: request.status,
      message: request.message,
      requestedAt: request.requestedAt,
    };
  }
}

export class ApplicantProfileResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Photo URL' })
  image!: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty()
  hasVerifiedEmail!: boolean;

  static fromDomain(profile: ApplicantProfile): ApplicantProfileResponseDto {
    return {
      name: profile.name,
      image: profile.image,
      bio: profile.bio,
      hasVerifiedEmail: profile.hasVerifiedEmail,
    };
  }
}

export class PendingRequestResponseDto extends ParticipationRequestResponseDto {
  @ApiProperty({ description: 'The applicant, for the link to their profile' })
  userId!: string;

  @ApiProperty({ type: ApplicantProfileResponseDto })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(request: PendingRequest): PendingRequestResponseDto {
    return {
      ...ParticipationRequestResponseDto.fromDomain(request),
      userId: request.userId,
      applicant: ApplicantProfileResponseDto.fromDomain(request.applicant),
    };
  }
}

export class PendingRequestPageResponseDto {
  @ApiProperty({ type: [PendingRequestResponseDto] })
  items!: PendingRequestResponseDto[];

  @ApiProperty({ description: 'All pending requests, not just this page' })
  total!: number;

  static fromDomain(page: PendingRequestPage): PendingRequestPageResponseDto {
    return {
      items: page.items.map(PendingRequestResponseDto.fromDomain),
      total: page.total,
    };
  }
}

// F-05.6. The rejection reason stays out here too.
export class DecidedRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DECIDED_STATUSES })
  status!: DecidedStatus;

  @ApiProperty({ description: 'The applicant, for the link to their profile' })
  userId!: string;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the person was rejected or withdrew',
  })
  changedAt!: Date;

  @ApiProperty({ type: ApplicantProfileResponseDto })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(request: DecidedRequest): DecidedRequestResponseDto {
    return {
      id: request.id,
      status: request.status,
      userId: request.userId,
      message: request.message,
      changedAt: request.changedAt,
      applicant: ApplicantProfileResponseDto.fromDomain(request.applicant),
    };
  }
}

export class DecidedRequestPageResponseDto {
  @ApiProperty({ type: [DecidedRequestResponseDto] })
  items!: DecidedRequestResponseDto[];

  @ApiProperty({ description: 'All of the state, not just this page' })
  total!: number;

  static fromDomain(page: DecidedRequestPage): DecidedRequestPageResponseDto {
    return {
      items: page.items.map(DecidedRequestResponseDto.fromDomain),
      total: page.total,
    };
  }
}

// F-05.6, F-06.4: a seat on the organizer's participants tab.
export class ParticipantResponseDto {
  @ApiProperty({ description: 'The seat' })
  id!: string;

  @ApiProperty({ enum: PARTICIPANT_STATUSES })
  status!: SeatStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "APPROVED: the message of the request that led to the seat. CANCELLED: the participant's words when cancelling",
  })
  message!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the person got the seat, or gave it back',
  })
  changedAt!: Date;

  @ApiProperty({
    description: 'CANCELLED only: they have asked to join again since',
  })
  asksAgain!: boolean;

  @ApiProperty({ type: ApplicantProfileResponseDto })
  person!: ApplicantProfileResponseDto;

  static fromDomain(participant: Participant): ParticipantResponseDto {
    return {
      id: participant.id,
      status: participant.status,
      message: participant.message,
      changedAt: participant.changedAt,
      asksAgain: participant.asksAgain,
      person: ApplicantProfileResponseDto.fromDomain(participant.person),
    };
  }
}

export class ParticipantPageResponseDto {
  @ApiProperty({ type: [ParticipantResponseDto] })
  items!: ParticipantResponseDto[];

  @ApiProperty({ description: 'All of the state, not just this page' })
  total!: number;

  static fromDomain(page: ParticipantPage): ParticipantPageResponseDto {
    return {
      items: page.items.map(ParticipantResponseDto.fromDomain),
      total: page.total,
    };
  }
}

export class MyRequestStateResponseDto {
  @ApiProperty({ type: ParticipationRequestResponseDto, nullable: true })
  request!: ParticipationRequestResponseDto | null;

  @ApiProperty({
    enum: JOIN_RULE_VIOLATIONS,
    isArray: true,
    description: 'Why a new request is refused now; empty when it is allowed',
  })
  violations!: JoinRuleViolation[];

  @ApiProperty({
    enum: SEAT_STATUSES,
    nullable: true,
    description:
      'Their seat, if they ever had one; CANCELLED after they gave it back (F-06.4)',
  })
  seat!: SeatStatus | null;

  @ApiProperty({
    enum: CANCEL_RULE_VIOLATIONS,
    isArray: true,
    description: 'Why cancelling the seat is refused now; empty when allowed',
  })
  cancelViolations!: CancelRuleViolation[];

  @ApiProperty({
    type: ApplicantProfileResponseDto,
    description: 'What the organizer sees of the signed-in user',
  })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(state: MyRequestState): MyRequestStateResponseDto {
    return {
      request: state.request
        ? ParticipationRequestResponseDto.fromDomain(state.request)
        : null,
      violations: state.violations,
      seat: state.seat,
      cancelViolations: state.cancelViolations,
      applicant: ApplicantProfileResponseDto.fromDomain(state.applicant),
    };
  }
}
