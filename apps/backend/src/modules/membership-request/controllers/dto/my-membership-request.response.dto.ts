import { isPubliclyVisible } from '@/modules/group/domain/group';
import {
  MyMembershipRequest,
  MyMembershipRequestPage,
  MyMembershipRequestStatus,
  myMembershipRequestStatusOf,
} from '@/modules/membership-request/domain/membership-request';
import { ApiProperty } from '@nestjs/swagger';

const MY_MEMBERSHIP_REQUEST_STATUSES: MyMembershipRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'CLOSED',
  'GROUP_CANCELLED',
];

export class MyMembershipRequestGroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    description:
      'Whether the group page can be opened; false once it was cancelled',
  })
  isOpen!: boolean;
}

// F-07.7: a request as its applicant sees it in their overview.
export class MyMembershipRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: MY_MEMBERSHIP_REQUEST_STATUSES,
    description:
      'GROUP_CANCELLED: still waiting, but the group was cancelled and nobody will decide it',
  })
  status!: MyMembershipRequestStatus;

  @ApiProperty({ type: String, nullable: true })
  message!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The admins' words with an approval or a rejection (#153)",
  })
  decisionMessage!: string | null;

  @ApiProperty({ type: MyMembershipRequestGroupResponseDto })
  group!: MyMembershipRequestGroupResponseDto;

  static fromDomain(
    request: MyMembershipRequest,
  ): MyMembershipRequestResponseDto {
    return {
      id: request.id,
      status: myMembershipRequestStatusOf(request),
      message: request.message,
      requestedAt: request.requestedAt,
      decidedAt: request.decidedAt,
      decisionMessage: request.decisionMessage,
      group: {
        id: request.group.id,
        name: request.group.name,
        isOpen: isPubliclyVisible(request.group),
      },
    };
  }
}

export class MyMembershipRequestPageResponseDto {
  @ApiProperty({ type: [MyMembershipRequestResponseDto] })
  items!: MyMembershipRequestResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as `cursor` for the next page; null on the last page',
  })
  nextCursor!: string | null;

  static fromDomain(
    page: MyMembershipRequestPage,
  ): MyMembershipRequestPageResponseDto {
    return {
      items: page.items.map((request) =>
        MyMembershipRequestResponseDto.fromDomain(request),
      ),
      nextCursor: page.nextCursor,
    };
  }
}
