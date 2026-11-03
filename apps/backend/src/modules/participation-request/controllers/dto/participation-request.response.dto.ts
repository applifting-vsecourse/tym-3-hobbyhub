import {
  ApplicantProfile,
  DecisionRuleViolation,
  JoinRuleViolation,
  ParticipationRequest,
  PendingRequest,
  PendingRequestPage,
  RequestStatus,
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
  @ApiProperty({ type: ApplicantProfileResponseDto })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(request: PendingRequest): PendingRequestResponseDto {
    return {
      ...ParticipationRequestResponseDto.fromDomain(request),
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
      applicant: ApplicantProfileResponseDto.fromDomain(state.applicant),
    };
  }
}
