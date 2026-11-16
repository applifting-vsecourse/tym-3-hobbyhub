import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { Controller, Get, Param, UseGuards, UsePipes } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PendingMembershipRequestResponseDto } from './dto/membership-request.response.dto';

// #238: the requests waiting on a group, in the administration's group detail.
// Here rather than in the group module, which this module already depends on.
@ApiTags('admin')
@Controller('admin/groups/:groupId/membership-requests')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminMembershipRequestsController {
  constructor(private readonly service: MembershipRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Requests waiting for a decision, oldest first' })
  @ApiResponse({ status: 200, type: [PendingMembershipRequestResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such group' })
  async listPending(
    @Param('groupId') groupId: string,
  ): Promise<PendingMembershipRequestResponseDto[]> {
    const requests =
      await this.service.getPendingRequestsForAdministration(groupId);
    return requests.map((request) =>
      PendingMembershipRequestResponseDto.fromDomain(request),
    );
  }
}
