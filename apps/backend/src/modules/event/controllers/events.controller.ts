import { EventsService } from '@/modules/event/services/events.service';
import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventListResponseDto } from './dto/event-list-item.response.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { eventsValidationPipe } from './events-validation.pipe';

// Public: browsing events needs no account (E2).
@ApiTags('events')
@Controller('events')
@UsePipes(eventsValidationPipe)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List upcoming public events, soonest first' })
  @ApiResponse({ status: 200, type: EventListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid limit or offset' })
  async list(@Query() query: ListEventsQuery): Promise<EventListResponseDto> {
    const page = await this.eventsService.getUpcomingPublicEvents({
      limit: query.limit,
      offset: query.offset,
    });
    return EventListResponseDto.fromDomain(page);
  }
}
