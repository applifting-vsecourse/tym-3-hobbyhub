import { EventsService } from '@/modules/event/services/events.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventListItemResponseDto } from './dto/event-list-item.response.dto';

// Public: browsing events does not need an account (E2).
@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List upcoming public events, soonest first' })
  @ApiResponse({ status: 200, type: [EventListItemResponseDto] })
  async list(): Promise<EventListItemResponseDto[]> {
    const events = await this.eventsService.getUpcomingPublicEvents();
    return events.map(EventListItemResponseDto.fromDomain);
  }
}
