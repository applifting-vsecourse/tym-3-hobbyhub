import { LandingService } from '@/modules/landing/services/landing.service';
import { OptionalUser } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LandingQuery } from './dto/landing.query';
import { LandingResponseDto } from './dto/landing.response.dto';
import { landingValidationPipe } from './landing-validation.pipe';

// #215: the rows of the landing page in one go, so an event shows in one row
// only. Open to visitors; a signed-in person also gets the rows about them.
@ApiTags('landing')
@Controller('landing')
@UsePipes(landingValidationPipe)
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      'The pre-filtered rows of events and groups for the landing page, in its order',
  })
  @ApiResponse({ status: 200, type: LandingResponseDto })
  @ApiResponse({ status: 400, description: 'City too long' })
  async get(
    @OptionalUser() user: Identity | undefined,
    @Query() query: LandingQuery,
  ): Promise<LandingResponseDto> {
    const landing = await this.landingService.getLanding(user, {
      city: query.city,
    });
    return LandingResponseDto.fromDomain(landing);
  }
}
