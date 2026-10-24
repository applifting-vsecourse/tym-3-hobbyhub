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
  Patch,
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
import { CancelEventDto } from './dto/cancel-event.dto';
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventDetailResponseDto,
  EventListResponseDto,
} from './dto/event-list-item.response.dto';
import { EventResponseDto } from './dto/event.response.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { UpdateEventDto } from './dto/update-event.dto';
import { eventsValidationPipe } from './events-validation.pipe';

@ApiTags('events')
@Controller('events')
@UsePipes(eventsValidationPipe)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Public: browsing events needs no account (E2).
  @Get()
  @ApiOperation({ summary: 'List upcoming public events, soonest first' })
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
      },
      minParticipants: body.minParticipants,
      maxParticipants: body.maxParticipants,
      externalOccupiedSpots: body.externalOccupiedSpots,
      contributionAmount: body.contributionAmount,
      contributionNote: body.contributionNote,
    });
    return EventResponseDto.fromDomain(event);
  }

  // The whole event as the organizer entered it, address included: the
  // public detail keeps that back.
  @Get(':id/manage')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get an event with every field, organizer only' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not the organizer' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getForOrganizer(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<EventResponseDto> {
    const event = await this.eventsService.getEventOfOrganizer(user, id);
    return EventResponseDto.fromDomain(event);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Edit an event that has not started (F-05.10)' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, broken rule, event already started, or capacity below the occupied seats',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not the organizer' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventsService.updateEvent(user, id, {
      title: body.title,
      activityId: body.activityId,
      description: body.description,
      equipment: body.equipment,
      venueType: body.venueType,
      approvalMode: body.approvalMode,
      startAt: body.startAt,
      endAt: body.endAt,
      location: body.location && {
        street: body.location.street,
        city: body.location.city,
        postalCode: body.location.postalCode,
        country: body.location.country,
        placeName: body.location.placeName,
      },
      minParticipants: body.minParticipants,
      maxParticipants: body.maxParticipants,
      externalOccupiedSpots: body.externalOccupiedSpots,
      contributionAmount: body.contributionAmount,
      contributionNote: body.contributionNote,
    });
    return EventResponseDto.fromDomain(event);
  }

  @Post(':id/cancel')
  @UseGuards(AuthenticatedUserGuard)
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a published event that has not started' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Unknown reason, or the event cannot be cancelled',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not the organizer' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async cancel(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: CancelEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventsService.cancelEvent(user, id, {
      cancellationReasonId: body.cancellationReasonId,
      cancellationNote: body.cancellationNote,
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
