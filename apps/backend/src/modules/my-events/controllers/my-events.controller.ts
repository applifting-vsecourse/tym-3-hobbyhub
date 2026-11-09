import { eventFilterOf } from '@/modules/event/controllers/dto/event-filter.query';
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
import {
  MyApplicationPageResponseDto,
  MyHostedEventsResponseDto,
} from './dto/my-events.response.dto';
import { myEventsValidationPipe } from './my-events-validation.pipe';

// F-06.3: the signed-in user's own overview, never anyone else's.
@ApiTags('my-events')
@Controller('my-events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(myEventsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 400, description: 'Invalid limit, offset or filter' })
export class MyEventsController {
  constructor(private readonly service: MyEventsService) {}

  @Get('applications')
  @ApiOperation({
    summary:
      'Applications with their state: waiting and approved ones to events still on first, soonest first; then the rest, latest first',
  })
  @ApiResponse({ status: 200, type: MyApplicationPageResponseDto })
  async applications(
    @User() user: Identity,
    @Query() query: MyEventsPageQuery,
  ): Promise<MyApplicationPageResponseDto> {
    return MyApplicationPageResponseDto.fromDomain(
      await this.service.getApplications(
        user,
        { limit: query.limit, offset: query.offset },
        eventFilterOf(query),
      ),
    );
  }

  @Get('hosted')
  @ApiOperation({
    summary:
      'Public events the user organizes: the ones still on first, soonest first; then the ones that are over, latest first',
  })
  @ApiResponse({ status: 200, type: MyHostedEventsResponseDto })
  async hosted(
    @User() user: Identity,
    @Query() query: MyEventsPageQuery,
  ): Promise<MyHostedEventsResponseDto> {
    return MyHostedEventsResponseDto.fromDomain(
      await this.service.getHosted(
        user,
        { limit: query.limit, offset: query.offset },
        eventFilterOf(query),
      ),
    );
  }
}
