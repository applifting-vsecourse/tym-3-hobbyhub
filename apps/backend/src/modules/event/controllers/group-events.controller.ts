import { EventsService } from '@/modules/event/services/events.service';
import { OptionalUser } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
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
import { GroupEventListResponseDto } from './dto/group-event.response.dto';
import { GroupEventsQuery } from './dto/group-events.query';
import { eventsValidationPipe } from './events-validation.pipe';

// F-07.2: the events of a group, on its page. Here and not in the group
// module: the event module asks the group module about membership, so the
// other way round would be a cycle.
@ApiTags('groups')
@Controller('groups/:groupId/events')
@ApiCookieAuth()
@UsePipes(eventsValidationPipe)
export class GroupEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      "A page of a group's events: upcoming public ones for everyone; group-only and past ones for its members",
  })
  @ApiResponse({ status: 200, type: GroupEventListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid period or offset' })
  @ApiResponse({
    status: 404,
    description:
      'Group not found or not public, or past events asked by a non-member',
  })
  async list(
    @OptionalUser() user: Identity | undefined,
    @Param('groupId') groupId: string,
    @Query() query: GroupEventsQuery,
  ): Promise<GroupEventListResponseDto> {
    return GroupEventListResponseDto.fromDomain(
      await this.eventsService.getGroupEvents(
        groupId,
        user,
        query.period,
        query.offset,
      ),
    );
  }
}
