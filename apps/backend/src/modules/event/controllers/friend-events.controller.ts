import { FriendEventsService } from '@/modules/event/services/friend-events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FriendEventsQuery } from './dto/friend-events.query';
import { FriendsEventPageResponseDto } from './dto/friend-events.response.dto';
import { eventsValidationPipe } from './events-validation.pipe';

// #226: „Akce přátel“ in the section Přátelé. Under /friends, where the client
// finds everything about friends, but served by the event module: the rules of
// who may see which event live here, and the friendship module must not
// depend on events (the event module depends on it).
@ApiTags('friends')
@Controller('friends/events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(eventsValidationPipe)
export class FriendEventsController {
  constructor(private readonly friendEventsService: FriendEventsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Upcoming events my friends go to or organize, soonest first, with which of them',
  })
  @ApiResponse({ status: 200, type: FriendsEventPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid offset' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: FriendEventsQuery,
  ): Promise<FriendsEventPageResponseDto> {
    return FriendsEventPageResponseDto.fromDomain(
      await this.friendEventsService.getFriendsEvents(user, query.offset),
    );
  }
}
