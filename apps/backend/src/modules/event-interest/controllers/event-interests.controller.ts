import { EventInterestsService } from '@/modules/event-interest/services/event-interests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventInterestStateResponseDto } from './dto/event-interest.response.dto';

// #231, ADR-0030: the signed-in user saves an event to their "Zajímá mě" list
// and removes it again. Who saves is the session, never the request. The list
// itself is `GET /api/my-events/interested`.
@ApiTags('event-interest')
@Controller('events/:eventId/interest')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Not signed in' })
export class EventInterestsController {
  constructor(private readonly service: EventInterestsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Whether the event is on the signed-in user\'s "Zajímá mě" list and whether they may save it',
  })
  @ApiResponse({ status: 200, type: EventInterestStateResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async state(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<EventInterestStateResponseDto> {
    return EventInterestStateResponseDto.fromDomain(
      await this.service.getState(user, eventId),
    );
  }

  @Put()
  @ApiOperation({
    summary:
      'Save the event to the list; saving it again changes nothing (idempotent)',
  })
  @ApiResponse({ status: 200, type: EventInterestStateResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'The event has started, is over or cancelled, or the user organizes it; `violations` says why',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async save(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<EventInterestStateResponseDto> {
    return EventInterestStateResponseDto.fromDomain(
      await this.service.save(user, eventId),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Remove the event from the list, whatever state it is in; removing what is not there changes nothing',
  })
  @ApiResponse({ status: 204, description: 'Not on the list (any more)' })
  async remove(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    await this.service.remove(user, eventId);
  }
}
