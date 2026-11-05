import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
  Param,
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
import { PageQuery } from './dto/page.query';
import { ParticipantPageResponseDto } from './dto/participation-request.response.dto';
import { participationRequestsValidationPipe } from './participation-requests-validation.pipe';

// F-04.2: who holds a seat, for the organizers of the event. They open each
// person's profile from here.
@ApiTags('participation-requests')
@Controller('events/:eventId/participants')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(participationRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 404, description: 'Event not found or not yours' })
export class EventParticipantsController {
  constructor(private readonly service: ParticipationRequestsService) {}

  @Get()
  @ApiOperation({
    summary:
      'People with an approved seat, in order of approval (organizers only)',
  })
  @ApiResponse({ status: 200, type: ParticipantPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid limit or offset' })
  async list(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Query() query: PageQuery,
  ): Promise<ParticipantPageResponseDto> {
    const page = await this.service.getParticipants(user, eventId, {
      limit: query.limit,
      offset: query.offset,
    });
    return ParticipantPageResponseDto.fromDomain(page);
  }
}
