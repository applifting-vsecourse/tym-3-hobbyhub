import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMembershipRequestDto } from './dto/create-membership-request.dto';
import {
  MEMBERSHIP_DECISION_VIOLATIONS,
  MembershipRequestResponseDto,
  MyMembershipRequestStateResponseDto,
  PendingMembershipRequestResponseDto,
} from './dto/membership-request.response.dto';
import { RejectMembershipRequestDto } from './dto/reject-membership-request.dto';
import { membershipRequestsValidationPipe } from './membership-requests-validation.pipe';

// F-07.3 requests to join a group: the applicant asks and may withdraw, the
// group's admins (ADR-0007) list the waiting ones and decide them.
@ApiTags('membership-requests')
@Controller('groups/:groupId/requests')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(membershipRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class MembershipRequestsController {
  constructor(private readonly service: MembershipRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask to join the group as the signed-in user' })
  @ApiResponse({ status: 201, type: MembershipRequestResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid message, or the group refuses the request; `violations` says why',
  })
  @ApiResponse({ status: 404, description: 'Group not found or not public' })
  async create(
    @User() user: Identity,
    @Param('groupId') groupId: string,
    @Body() body: CreateMembershipRequestDto,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.service.requestMembership(
      user,
      groupId,
      body.message,
    );
    return MembershipRequestResponseDto.fromDomain(request);
  }

  @Get()
  @ApiOperation({
    summary: 'Requests waiting for a decision, oldest first (admins only)',
  })
  @ApiResponse({ status: 200, type: [PendingMembershipRequestResponseDto] })
  @ApiResponse({
    status: 404,
    description: 'Group not found, or the user does not manage it',
  })
  async listPending(
    @User() user: Identity,
    @Param('groupId') groupId: string,
  ): Promise<PendingMembershipRequestResponseDto[]> {
    const requests = await this.service.getPendingRequests(user, groupId);
    return requests.map((request) =>
      PendingMembershipRequestResponseDto.fromDomain(request),
    );
  }

  @Get('mine')
  @ApiOperation({
    summary:
      "The signed-in user's request on the group and whether they may ask",
  })
  @ApiResponse({ status: 200, type: MyMembershipRequestStateResponseDto })
  @ApiResponse({ status: 404, description: 'Group not found or not public' })
  async mine(
    @User() user: Identity,
    @Param('groupId') groupId: string,
  ): Promise<MyMembershipRequestStateResponseDto> {
    const state = await this.service.getMyRequestState(user, groupId);
    return MyMembershipRequestStateResponseDto.fromDomain(state);
  }

  @Delete('mine')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Withdraw the signed-in user's pending request" })
  @ApiResponse({ status: 204, description: 'Withdrawn' })
  @ApiResponse({ status: 404, description: 'No pending request to withdraw' })
  async withdraw(
    @User() user: Identity,
    @Param('groupId') groupId: string,
  ): Promise<void> {
    await this.service.withdrawMyRequest(user, groupId);
  }

  @Post(':requestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a waiting request; the applicant becomes a member',
  })
  @ApiResponse({ status: 200, type: MembershipRequestResponseDto })
  @ApiResponse({
    status: 400,
    description: `The request cannot be approved now; \`violations\` says why: ${MEMBERSHIP_DECISION_VIOLATIONS.join(', ')}`,
  })
  @ApiResponse({ status: 404, description: 'Not an admin, or no request' })
  async approve(
    @User() user: Identity,
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.service.approveRequest(user, groupId, requestId);
    return MembershipRequestResponseDto.fromDomain(request);
  }

  @Post(':requestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a waiting request, final for the group (ADR-0014)',
  })
  @ApiResponse({ status: 200, type: MembershipRequestResponseDto })
  @ApiResponse({
    status: 400,
    description: `Invalid reason, or the request cannot be rejected now; \`violations\` says why: ${MEMBERSHIP_DECISION_VIOLATIONS.join(', ')}`,
  })
  @ApiResponse({ status: 404, description: 'Not an admin, or no request' })
  async reject(
    @User() user: Identity,
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Body() body: RejectMembershipRequestDto,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.service.rejectRequest(
      user,
      groupId,
      requestId,
      body.reason,
    );
    return MembershipRequestResponseDto.fromDomain(request);
  }
}
