import { ProfileService } from '@/modules/profile/services/profile.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { AdminListQuery } from '@/shared/admin-auth/dto/admin-list.query';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import {
  Controller,
  Get,
  Param,
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
import {
  AdminUserDetailResponseDto,
  AdminUserPageResponseDto,
} from './dto/admin-user.response.dto';

// #238: user accounts in the administration, read only. The person's events
// come from `AdminUserEventsController`.
@ApiTags('admin')
@Controller('admin/users')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminUsersController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'List every account, newest first' })
  @ApiResponse({ status: 200, type: AdminUserPageResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async list(
    @Query() query: AdminListQuery,
  ): Promise<AdminUserPageResponseDto> {
    const page = await this.profileService.listUsersForAdministration({
      search: query.q,
      offset: query.offset,
    });
    return AdminUserPageResponseDto.fromDomain(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'An account with its whole profile' })
  @ApiResponse({ status: 200, type: AdminUserDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such user' })
  async detail(@Param('id') id: string): Promise<AdminUserDetailResponseDto> {
    const detail = await this.profileService.getUserForAdministration(id);
    return AdminUserDetailResponseDto.fromDomain(detail);
  }
}
