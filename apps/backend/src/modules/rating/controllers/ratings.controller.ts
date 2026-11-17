import { RatingsService } from '@/modules/rating/services/ratings.service';
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
import {
  ListGivenRatingsQuery,
  ListReceivedRatingsQuery,
} from './dto/list-ratings.query';
import {
  GivenRatingPageResponseDto,
  ReceivedRatingPageResponseDto,
} from './dto/rating.response.dto';
import { ratingsValidationPipe } from './ratings-validation.pipe';

// #236, ADR-0027: the signed-in person's own ratings, "Moje hodnocení".
@ApiTags('ratings')
@Controller('ratings')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(ratingsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('received')
  @ApiOperation({
    summary:
      'Revealed ratings the signed-in person received as an organizer or as a participant, newest first, with author and comment',
  })
  @ApiResponse({ status: 200, type: ReceivedRatingPageResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid direction, limit or offset',
  })
  async received(
    @User() user: Identity,
    @Query() query: ListReceivedRatingsQuery,
  ): Promise<ReceivedRatingPageResponseDto> {
    return ReceivedRatingPageResponseDto.fromDomain(
      await this.ratingsService.getReceived(user, query.direction, {
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }

  @Get('given')
  @ApiOperation({
    summary:
      'Ratings the signed-in person gave, newest first, and whether the rated person sees them yet',
  })
  @ApiResponse({ status: 200, type: GivenRatingPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid limit or offset' })
  async given(
    @User() user: Identity,
    @Query() query: ListGivenRatingsQuery,
  ): Promise<GivenRatingPageResponseDto> {
    return GivenRatingPageResponseDto.fromDomain(
      await this.ratingsService.getGiven(user, {
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }
}
