import { RatingsService } from '@/modules/rating/services/ratings.service';
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
import { CreateRatingDto } from './dto/create-rating.dto';
import {
  EventRatingStateResponseDto,
  RATING_VIOLATIONS,
  RatingResponseDto,
} from './dto/rating.response.dto';
import { ratingsValidationPipe } from './ratings-validation.pipe';

const REFUSED = `Invalid stars or comment, or the rating is refused; \`violations\` says why: ${RATING_VIOLATIONS.join(', ')}`;

// #236, ADR-0027: ratings after one event. A participant rates the main
// organizer, the main organizer rates the participants. Nobody sees a rating
// about them until the rating period is over. The forms are #234 and #235.
@ApiTags('ratings')
@Controller('events/:eventId/ratings')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(ratingsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({
  status: 404,
  description:
    'Event not found, or the signed-in person neither runs it nor had a seat',
})
export class EventRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Who the signed-in person may rate at the event, what they gave, and until when',
  })
  @ApiResponse({ status: 200, type: EventRatingStateResponseDto })
  async state(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<EventRatingStateResponseDto> {
    return EventRatingStateResponseDto.fromDomain(
      await this.ratingsService.getEventRatingState(user, eventId),
    );
  }

  @Post('organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Rate the main organizer, as a participant (final)',
  })
  @ApiResponse({ status: 201, type: RatingResponseDto })
  @ApiResponse({ status: 400, description: REFUSED })
  async rateOrganizer(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Body() body: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    return RatingResponseDto.fromDomain(
      await this.ratingsService.rateOrganizer(user, eventId, body),
    );
  }

  @Post('participants/:userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Rate a participant, as the main organizer (final)',
  })
  @ApiResponse({ status: 201, type: RatingResponseDto })
  @ApiResponse({ status: 400, description: REFUSED })
  async rateParticipant(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Param('userId') participantId: string,
    @Body() body: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    return RatingResponseDto.fromDomain(
      await this.ratingsService.rateParticipant(
        user,
        eventId,
        participantId,
        body,
      ),
    );
  }
}
