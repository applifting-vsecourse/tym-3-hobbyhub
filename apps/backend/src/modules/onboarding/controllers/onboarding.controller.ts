import {
  ONBOARDING_STEPS,
  OnboardingStep,
} from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
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
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OnboardingResponseDto } from './dto/onboarding.response.dto';
import {
  SaveActivitiesDto,
  SaveLocationDto,
  SaveProfileDto,
} from './dto/save-onboarding.dto';
import { onboardingValidationPipe } from './onboarding-validation.pipe';

const OnboardingStepEnum = Object.fromEntries(
  ONBOARDING_STEPS.map((step) => [step, step]),
);

// F-04.8. Everything acts on the signed-in user, never on an id from the
// request.
@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(onboardingValidationPipe)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'Progress and saved answers of the onboarding' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async get(@User() user: Identity): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.getOnboarding(user),
    );
  }

  @Put('activities')
  @ApiOperation({ summary: 'Save the activities with a level (step 1)' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or activity' })
  async saveActivities(
    @User() user: Identity,
    @Body() body: SaveActivitiesDto,
  ): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.saveActivities(
        user,
        body.items.map((item) => ({
          activityId: item.activityId,
          levelId: item.levelId ?? null,
        })),
      ),
    );
  }

  @Put('location')
  @ApiOperation({ summary: 'Save the private home address and range (step 2)' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async saveLocation(
    @User() user: Identity,
    @Body() body: SaveLocationDto,
  ): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.saveLocation(user, {
        address: {
          street: body.street,
          city: body.city,
          postalCode: body.postalCode,
          country: body.country,
          latitude: body.latitude,
          longitude: body.longitude,
        },
        travelRadiusKm: body.travelRadiusKm,
      }),
    );
  }

  @Put('profile')
  @ApiOperation({ summary: 'Save the short bio (step 3)' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  // TODO(F-04.1 #18): the profile photo is not uploaded yet, the project has
  // no image storage.
  async saveProfile(
    @User() user: Identity,
    @Body() body: SaveProfileDto,
  ): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.saveProfile(user, {
        bio: body.bio ?? null,
      }),
    );
  }

  @Post('steps/:step/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip one step' })
  @ApiParam({ name: 'step', enum: ONBOARDING_STEPS })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 400, description: 'Unknown step' })
  async skipStep(
    @User() user: Identity,
    @Param('step', new ParseEnumPipe(OnboardingStepEnum)) step: OnboardingStep,
  ): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.skipStep(user, step),
    );
  }

  @Post('finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish the onboarding from the summary' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  @ApiResponse({ status: 400, description: 'A step is still open' })
  async finish(@User() user: Identity): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.finish(user),
    );
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip the whole onboarding' })
  @ApiResponse({ status: 200, type: OnboardingResponseDto })
  async skipAll(@User() user: Identity): Promise<OnboardingResponseDto> {
    return OnboardingResponseDto.fromDomain(
      await this.onboardingService.skipAll(user),
    );
  }
}
