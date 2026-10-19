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
import { EventResponseDto } from './dto/event.response.dto';
import { eventsValidationPipe } from './events-validation.pipe';

@ApiTags('events')
@Controller('events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(eventsValidationPipe)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
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

  @Get(':id')
  @ApiOperation({ summary: 'Get an event' })
  @ApiResponse({ status: 200, type: EventResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  // TODO(F-02.4 #8): the public detail decides who sees what (private venue
  // address only after approval, F-10.4). Until then any signed-in user gets
  // the whole event, which F-05.1 needs only for the organizer's own landing.
  async detail(@Param('id') id: string): Promise<EventResponseDto> {
    const event = await this.eventsService.getEvent(id);
    return EventResponseDto.fromDomain(event);
  }
}
