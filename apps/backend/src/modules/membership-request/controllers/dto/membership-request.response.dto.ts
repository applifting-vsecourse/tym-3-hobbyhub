import {
  ApplicantProfile,
  MembershipDecisionViolation,
  MembershipRequest,
  MembershipRuleViolation,
  PendingMembershipRequest,
} from '@/modules/membership-request/domain/membership-request';
import { MyMembershipRequestState } from '@/modules/membership-request/services/membership-requests.service';
import { RequestStatus } from '@/modules/participation-request/domain/participation-request';
import { ApiProperty } from '@nestjs/swagger';

const REQUEST_STATUSES: RequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'CLOSED',
];

const MEMBERSHIP_RULE_VIOLATIONS: MembershipRuleViolation[] = [
  'IS_MEMBER',
  'ALREADY_REQUESTED',
  'REJECTED_BEFORE',
];

export const MEMBERSHIP_DECISION_VIOLATIONS: MembershipDecisionViolation[] = [
  'GROUP_CANCELLED',
  'NOT_PENDING',
  'APPLICANT_IS_MEMBER',
];

export class MembershipRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty({ enum: REQUEST_STATUSES })
  status!: RequestStatus;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: Date;

  static fromDomain(request: MembershipRequest): MembershipRequestResponseDto {
    return {
      id: request.id,
      groupId: request.groupId,
      status: request.status,
      message: request.message,
      requestedAt: request.requestedAt,
    };
  }
}

export class ApplicantProfileResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty()
  hasVerifiedEmail!: boolean;

  static fromDomain(applicant: ApplicantProfile): ApplicantProfileResponseDto {
    return {
      name: applicant.name,
      image: applicant.image,
      bio: applicant.bio,
      hasVerifiedEmail: applicant.hasVerifiedEmail,
    };
  }
}

export class MyMembershipRequestStateResponseDto {
  @ApiProperty({ type: MembershipRequestResponseDto, nullable: true })
  request!: MembershipRequestResponseDto | null;

  @ApiProperty({
    enum: MEMBERSHIP_RULE_VIOLATIONS,
    isArray: true,
    description: 'Why a new request is refused now; empty when it is allowed',
  })
  violations!: MembershipRuleViolation[];

  @ApiProperty({
    type: ApplicantProfileResponseDto,
    description: "What the group's admins will see of the user",
  })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(
    state: MyMembershipRequestState,
  ): MyMembershipRequestStateResponseDto {
    return {
      request: state.request
        ? MembershipRequestResponseDto.fromDomain(state.request)
        : null,
      violations: state.violations,
      applicant: ApplicantProfileResponseDto.fromDomain(state.applicant),
    };
  }
}

export class PendingMembershipRequestResponseDto extends MembershipRequestResponseDto {
  @ApiProperty({ type: ApplicantProfileResponseDto })
  applicant!: ApplicantProfileResponseDto;

  static fromDomain(
    request: PendingMembershipRequest,
  ): PendingMembershipRequestResponseDto {
    return {
      ...MembershipRequestResponseDto.fromDomain(request),
      applicant: ApplicantProfileResponseDto.fromDomain(request.applicant),
    };
  }
}
