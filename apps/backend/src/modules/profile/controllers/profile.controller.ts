import { SaveActivitiesDto } from '@/modules/onboarding/controllers/dto/save-onboarding.dto';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ProfileResponseDto,
  PublicProfileResponseDto,
} from './dto/profile.response.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateProfileLocationDto } from './dto/update-profile-location.dto';
import {
  UpdatePrivateDetailsDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import { profileValidationPipe } from './profile-validation.pipe';

// F-04.1. Everything acts on the signed-in user, never on an id from the
// request.
@ApiTags('profile')
@Controller('profile')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(profileValidationPipe)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'My profile, with the private details' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async get(@User() user: Identity): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.getProfile(user),
    );
  }

  // Declared after `GET /profile`; `private`, `activities` and `location` are
  // PUT routes, so the id cannot swallow them.
  @Get(':userId')
  @ApiOperation({ summary: "Another person's public profile" })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such user' })
  async getPublic(
    @User() user: Identity,
    @Param('userId') userId: string,
  ): Promise<PublicProfileResponseDto> {
    return PublicProfileResponseDto.fromDomain(
      await this.profileService.getPublicProfile(userId, user),
    );
  }

  @Patch()
  @ApiOperation({ summary: 'Change the nickname, bio or photo' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or photo' })
  async update(
    @User() user: Identity,
    @Body() body: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.updatePublic(user, body),
    );
  }

  @Put('private')
  @ApiOperation({
    summary:
      'Correct the private gender and year of birth, and choose what my friends see of my events',
  })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, half of a pair, or under 18',
  })
  async updatePrivate(
    @User() user: Identity,
    @Body() body: UpdatePrivateDetailsDto,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.updatePrivate(user, {
        ...(body.gender !== undefined &&
          body.birthYear !== undefined && {
            details: { gender: body.gender, birthYear: body.birthYear },
          }),
        ...(body.friendsSeeEventHistory !== undefined &&
          body.friendsSeeUpcomingEvents !== undefined && {
            friendVisibility: {
              friendsSeeEventHistory: body.friendsSeeEventHistory,
              friendsSeeUpcomingEvents: body.friendsSeeUpcomingEvents,
            },
          }),
      }),
    );
  }

  @Put('activities')
  @ApiOperation({ summary: 'Replace the activities I play' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or activity' })
  async updateActivities(
    @User() user: Identity,
    @Body() body: SaveActivitiesDto,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.updateActivities(
        user,
        body.items.map((item) => ({
          activityId: item.activityId,
          levelId: item.levelId ?? null,
        })),
      ),
    );
  }

  @Put('location')
  @ApiOperation({ summary: 'Change my private home address' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateLocation(
    @User() user: Identity,
    @Body() body: UpdateProfileLocationDto,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.updateLocation(user, { ...body }),
    );
  }

  // #262. Not part of the profile response: the app reads the language from
  // the session, which it loads on every page anyway.
  @Put('language')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the language the app speaks to me' })
  @ApiResponse({ status: 204, description: 'Saved' })
  @ApiResponse({ status: 400, description: 'Not CS or EN' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async updateLanguage(
    @User() user: Identity,
    @Body() body: UpdateLanguageDto,
  ): Promise<void> {
    await this.profileService.updateLanguage(user, body.language);
  }

  @Delete('location')
  @ApiOperation({
    summary: 'Remove my whole location: address, temporary place and radius',
  })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async removeLocation(@User() user: Identity): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.removeLocation(user),
    );
  }
}
