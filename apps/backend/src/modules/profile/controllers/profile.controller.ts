import { SaveActivitiesDto } from '@/modules/onboarding/controllers/dto/save-onboarding.dto';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
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
import { ProfileResponseDto } from './dto/profile.response.dto';
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
  @ApiOperation({ summary: 'Correct the private gender and birth date' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or under 18' })
  async updatePrivate(
    @User() user: Identity,
    @Body() body: UpdatePrivateDetailsDto,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.profileService.updatePrivate(user, body),
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
}
