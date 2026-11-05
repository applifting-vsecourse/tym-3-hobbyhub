import { EventListResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import { MyEventsService } from '@/modules/my-events/services/my-events.service';
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
import { MyEventsPageQuery } from './dto/my-events-page.query';
import { MyApplicationPageResponseDto } from './dto/my-events.response.dto';
import { myEventsValidationPipe } from './my-events-validation.pipe';

// F-06.3: the signed-in user's own overview, never anyone else's.
@ApiTags('my-events')
@Controller('my-events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(myEventsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 400, description: 'Invalid limit or offset' })
export class MyEventsController {
  constructor(private readonly service: MyEventsService) {}

  @Get('applications')
  @ApiOperation({
    summary:
      'Applications to events that are not over, with their state, soonest first',
  })
  @ApiResponse({ status: 200, type: MyApplicationPageResponseDto })
  async applications(
    @User() user: Identity,
    @Query() query: MyEventsPageQuery,
  ): Promise<MyApplicationPageResponseDto> {
    return MyApplicationPageResponseDto.fromDomain(
      await this.service.getApplications(user, {
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }

  @Get('hosted')
  @ApiOperation({
    summary:
      'Published events the user organizes that are not over, soonest first',
  })
  @ApiResponse({ status: 200, type: EventListResponseDto })
  async hosted(
    @User() user: Identity,
    @Query() query: MyEventsPageQuery,
  ): Promise<EventListResponseDto> {
    return EventListResponseDto.fromDomain(
      await this.service.getHosted(user, {
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }
}
