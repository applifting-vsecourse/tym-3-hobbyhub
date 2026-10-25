import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
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
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateParticipationRequestDto } from './dto/create-participation-request.dto';
import { ListPendingRequestsQuery } from './dto/list-pending-requests.query';
import {
  DECISION_RULE_VIOLATIONS,
  MyRequestStateResponseDto,
  ParticipationRequestResponseDto,
  PendingRequestPageResponseDto,
} from './dto/participation-request.response.dto';
import { RejectParticipationRequestDto } from './dto/reject-participation-request.dto';
import { participationRequestsValidationPipe } from './participation-requests-validation.pipe';

// F-06.1 requests to join, seen by the applicant, and F-05.7 the organizer's
// side: listing the waiting ones and deciding them. Automatic approval is
// F-05.5.
@ApiTags('participation-requests')
@Controller('events/:eventId/requests')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(participationRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 404, description: 'Event not found or not public' })
export class ParticipationRequestsController {
  constructor(private readonly service: ParticipationRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask to join the event as the signed-in user' })
  @ApiResponse({
    status: 201,
    type: ParticipationRequestResponseDto,
    description:
      'PENDING for the organizer to decide, or APPROVED with the seat taken when the event approves automatically',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid message, or the event refuses the request; `violations` says why',
  })
  async create(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Body() body: CreateParticipationRequestDto,
  ): Promise<ParticipationRequestResponseDto> {
    const request = await this.service.requestToJoin(
      user,
      eventId,
      body.message,
    );
    return ParticipationRequestResponseDto.fromDomain(request);
  }

  @Get()
  @ApiOperation({
    summary: 'Requests waiting for a decision, oldest first (organizers only)',
  })
  @ApiResponse({ status: 200, type: PendingRequestPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid limit or offset' })
  async listPending(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Query() query: ListPendingRequestsQuery,
  ): Promise<PendingRequestPageResponseDto> {
    const page = await this.service.getPendingRequests(user, eventId, {
      limit: query.limit,
      offset: query.offset,
    });
    return PendingRequestPageResponseDto.fromDomain(page);
  }

  @Get('mine')
  @ApiOperation({
    summary:
      "The signed-in user's request on the event and whether they may ask",
  })
  @ApiResponse({ status: 200, type: MyRequestStateResponseDto })
  async mine(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<MyRequestStateResponseDto> {
    const state = await this.service.getMyRequestState(user, eventId);
    return MyRequestStateResponseDto.fromDomain(state);
  }

  @Delete('mine')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Withdraw the signed-in user's pending request" })
  @ApiResponse({ status: 204, description: 'Withdrawn' })
  @ApiResponse({ status: 404, description: 'No pending request to withdraw' })
  async withdraw(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    await this.service.withdrawMyRequest(user, eventId);
  }

  @Post(':requestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a waiting request; the applicant takes a seat',
  })
  @ApiResponse({ status: 200, type: ParticipationRequestResponseDto })
  @ApiResponse({
    status: 400,
    description: `The request cannot be approved now; \`violations\` says why: ${DECISION_RULE_VIOLATIONS.join(', ')}`,
  })
  @ApiResponse({ status: 404, description: 'Not an organizer, or no request' })
  async approve(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
  ): Promise<ParticipationRequestResponseDto> {
    const request = await this.service.approveRequest(user, eventId, requestId);
    return ParticipationRequestResponseDto.fromDomain(request);
  }

  @Post(':requestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a waiting request, final for the event (ADR-0013)',
  })
  @ApiResponse({ status: 200, type: ParticipationRequestResponseDto })
  @ApiResponse({
    status: 400,
    description: `Invalid reason, or the request cannot be rejected now; \`violations\` says why: ${DECISION_RULE_VIOLATIONS.join(', ')}`,
  })
  @ApiResponse({ status: 404, description: 'Not an organizer, or no request' })
  async reject(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body() body: RejectParticipationRequestDto,
  ): Promise<ParticipationRequestResponseDto> {
    const request = await this.service.rejectRequest(
      user,
      eventId,
      requestId,
      body.reason,
    );
    return ParticipationRequestResponseDto.fromDomain(request);
  }
}
