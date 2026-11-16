import { GroupsService } from '@/modules/group/services/groups.service';
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
  AdminGroupDetailResponseDto,
  AdminGroupPageResponseDto,
} from './dto/admin-group.response.dto';

// #238: groups in the administration, read only. Private and cancelled ones
// too (visibility matrix: Superadmin). Pending requests to join come from
// `AdminMembershipRequestsController`.
@ApiTags('admin')
@Controller('admin/groups')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List every group, newest first' })
  @ApiResponse({ status: 200, type: AdminGroupPageResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async list(
    @Query() query: AdminListQuery,
  ): Promise<AdminGroupPageResponseDto> {
    const page = await this.groupsService.listGroupsForAdministration({
      search: query.q,
      offset: query.offset,
    });
    return AdminGroupPageResponseDto.fromDomain(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A group with its members' })
  @ApiResponse({ status: 200, type: AdminGroupDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such group' })
  async detail(@Param('id') id: string): Promise<AdminGroupDetailResponseDto> {
    const detail = await this.groupsService.getGroupForAdministration(id);
    return AdminGroupDetailResponseDto.fromDomain(detail);
  }
}
