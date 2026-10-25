import { EventsService } from '@/modules/event/services/events.service';
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
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventDetailResponseDto,
  EventListResponseDto,
} from './dto/event-list-item.response.dto';
import { EventResponseDto } from './dto/event.response.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { eventsValidationPipe } from './events-validation.pipe';

@ApiTags('events')
@Controller('events')
@UsePipes(eventsValidationPipe)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Public: browsing events needs no account (E2).
  @Get()
  @ApiOperation({
    summary:
      'List upcoming public events, soonest first or nearest first with lat and lng',
  })
  @ApiResponse({ status: 200, type: EventListResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit, offset or filter',
  })
  async list(@Query() query: ListEventsQuery): Promise<EventListResponseDto> {
    const page = await this.eventsService.getUpcomingPublicEvents(
      { limit: query.limit, offset: query.offset },
      {
        activityIds: query.activityIds,
        search: query.search,
        location: query.location,
        near:
          query.lat !== undefined && query.lng !== undefined
            ? { latitude: query.lat, longitude: query.lng }
            : undefined,
      },
    );
    return EventListResponseDto.fromDomain(page);
  }

  @Post()
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create and publish an event organized by the signed-in user',
  })
  @ApiResponse({ status: 201, type: EventResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, broken rule between fields, or activity',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventsService.createEvent(user, {
      title: body.title,
      activityId: body.activityId,
      description: body.description,
      equipment: body.equipment,
      venueType: body.venueType,
      approvalMode: body.approvalMode,
      startAt: body.startAt,
      endAt: body.endAt,
      location: {
        street: body.location.street,
        city: body.location.city,
        postalCode: body.location.postalCode,
        country: body.location.country,
        placeName: body.location.placeName,
        // An explicit null (a client that sends "no position") means none.
        latitude: body.location.latitude ?? undefined,
        longitude: body.location.longitude ?? undefined,
      },
      minParticipants: body.minParticipants,
      maxParticipants: body.maxParticipants,
      externalOccupiedSpots: body.externalOccupiedSpots,
      contributionAmount: body.contributionAmount,
      contributionNote: body.contributionNote,
    });
    return EventResponseDto.fromDomain(event);
  }

  // Public detail (F-02.4): approximate place only; the exact address and the
  // online link of an event stay with approved participants (F-10.4).
  @Get(':id')
  @ApiOperation({ summary: 'Get a public event' })
  @ApiResponse({ status: 200, type: EventDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found or not public' })
  async detail(@Param('id') id: string): Promise<EventDetailResponseDto> {
    const event = await this.eventsService.getPublicEvent(id);
    return EventDetailResponseDto.fromDomainDetail(event);
  }
}
