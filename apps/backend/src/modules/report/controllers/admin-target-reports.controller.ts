import { ReportsService } from '@/modules/report/services/reports.service';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminReportListItemResponseDto,
  AdminUserReportsResponseDto,
} from './dto/admin-report.response.dto';

// #240, ADR-0023: the reports in the detail of a user and of an event in the
// administration. Every state, newest first.
@ApiTags('admin')
@Controller('admin')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@ApiResponse({ status: 401, description: 'Not signed in as administrator' })
export class AdminTargetReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('users/:userId/reports')
  @ApiOperation({ summary: 'Reports about the user, and the ones they filed' })
  @ApiResponse({ status: 200, type: AdminUserReportsResponseDto })
  @ApiResponse({ status: 404, description: 'No such user' })
  async ofUser(
    @Param('userId') userId: string,
  ): Promise<AdminUserReportsResponseDto> {
    return AdminUserReportsResponseDto.fromDomain(
      await this.reportsService.listOfUser(userId),
    );
  }

  @Get('events/:eventId/reports')
  @ApiOperation({ summary: 'Reports about the event' })
  @ApiResponse({ status: 200, type: [AdminReportListItemResponseDto] })
  @ApiResponse({ status: 404, description: 'No such event' })
  async ofEvent(
    @Param('eventId') eventId: string,
  ): Promise<AdminReportListItemResponseDto[]> {
    const reports = await this.reportsService.listOfEvent(eventId);
    return reports.map((item) =>
      AdminReportListItemResponseDto.fromDomain(item),
    );
  }
}
