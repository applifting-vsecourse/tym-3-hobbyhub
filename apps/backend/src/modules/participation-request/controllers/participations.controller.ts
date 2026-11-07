import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
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
import { CancelParticipationDto } from './dto/cancel-participation.dto';
import { ListParticipantsQuery } from './dto/list-participants.query';
import {
  CANCEL_RULE_VIOLATIONS,
  ParticipantPageResponseDto,
} from './dto/participation-request.response.dto';
import { participationRequestsValidationPipe } from './participation-requests-validation.pipe';

// The seats a request leads to (ADR-0003): F-06.4 the holder gives theirs
// back, F-05.6 the organizers see who has one and who gave it back. The seat
// lives in this module because taking it is part of approving a request.
@ApiTags('participations')
@Controller('events/:eventId/participations')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(participationRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 404, description: 'Event not found or not public' })
export class ParticipationsController {
  constructor(private readonly service: ParticipationRequestsService) {}

  @Get()
  @ApiOperation({
    summary:
      'People with a seat, or who gave it back, latest change first (organizers only)',
  })
  @ApiResponse({ status: 200, type: ParticipantPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state, limit or offset' })
  async list(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Query() query: ListParticipantsQuery,
  ): Promise<ParticipantPageResponseDto> {
    const page = await this.service.getParticipants(
      user,
      eventId,
      query.status,
      {
        limit: query.limit,
        offset: query.offset,
      },
    );
    return ParticipantPageResponseDto.fromDomain(page);
  }

  @Post('mine/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Cancel the signed-in user's seat before the event starts; the organizers are told why",
  })
  @ApiResponse({ status: 204, description: 'Cancelled, the seat is free' })
  @ApiResponse({
    status: 400,
    description: `Invalid message, or the seat cannot be cancelled now; \`violations\` says why: ${CANCEL_RULE_VIOLATIONS.join(', ')}`,
  })
  async cancelMine(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Body() body: CancelParticipationDto,
  ): Promise<void> {
    await this.service.cancelMySeat(user, eventId, body.message);
  }
}
