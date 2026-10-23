import {
  JoinRuleViolation,
  ParticipationRequest,
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
  'EVENT_STARTED',
  'EVENT_FULL',
  'IS_ORGANIZER',
  'HAS_SEAT',
  'ALREADY_REQUESTED',
  'REJECTED_BEFORE',
];

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

export class MyRequestStateResponseDto {
  @ApiProperty({ type: ParticipationRequestResponseDto, nullable: true })
  request!: ParticipationRequestResponseDto | null;

  @ApiProperty({
    enum: JOIN_RULE_VIOLATIONS,
    isArray: true,
    description: 'Why a new request is refused now; empty when it is allowed',
  })
  violations!: JoinRuleViolation[];

  static fromDomain(state: MyRequestState): MyRequestStateResponseDto {
    return {
      request: state.request
        ? ParticipationRequestResponseDto.fromDomain(state.request)
        : null,
      violations: state.violations,
    };
  }
}
