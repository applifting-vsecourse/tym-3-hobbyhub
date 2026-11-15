import { ReportsService } from '@/modules/report/services/reports.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { Admin } from '@/shared/admin-auth/decorators/admin.decorator';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { AdminReportListQuery } from './dto/admin-report-list.query';
import {
  AdminReportCountResponseDto,
  AdminReportDetailResponseDto,
  AdminReportPageResponseDto,
} from './dto/admin-report.response.dto';
import { AssignReportDto } from './dto/assign-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

// #240, #73, ADR-0023: the queue of reports. Every step is written to the
// audit log.
@ApiTags('admin')
@Controller('admin/reports')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in as administrator' })
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'The queue of reports, newest first' })
  @ApiResponse({ status: 200, type: AdminReportPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid filter or offset' })
  async list(
    @Admin() admin: AdminIdentity,
    @Query() query: AdminReportListQuery,
  ): Promise<AdminReportPageResponseDto> {
    const page = await this.reportsService.list({
      status: query.status,
      targetType: query.targetType,
      assigneeId: query.mine ? admin.id : undefined,
      offset: query.offset,
    });
    return AdminReportPageResponseDto.fromDomain(page);
  }

  @Get('new-count')
  @ApiOperation({ summary: 'How many reports nobody has taken up yet' })
  @ApiResponse({ status: 200, type: AdminReportCountResponseDto })
  async newCount(): Promise<AdminReportCountResponseDto> {
    return { count: await this.reportsService.countNew() };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'A report with the other open reports about its target and its history',
  })
  @ApiResponse({ status: 200, type: AdminReportDetailResponseDto })
  @ApiResponse({ status: 404, description: 'No such report' })
  async detail(@Param('id') id: string): Promise<AdminReportDetailResponseDto> {
    return AdminReportDetailResponseDto.fromDomain(
      await this.reportsService.getDetail(id),
    );
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Take the report over, or hand it to an active colleague (administratorId)',
  })
  @ApiResponse({ status: 200, type: AdminReportDetailResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Resolved already, in their hands already, or not an active administrator',
  })
  @ApiResponse({ status: 404, description: 'No such report' })
  @ApiResponse({ status: 409, description: 'Someone changed it meanwhile' })
  async assign(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
    @Body() body: AssignReportDto,
  ): Promise<AdminReportDetailResponseDto> {
    return AdminReportDetailResponseDto.fromDomain(
      await this.reportsService.assign(admin, id, body.administratorId),
    );
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resolve the report with a note; the reporter is told it was dealt with, the first time only',
  })
  @ApiResponse({ status: 200, type: AdminReportDetailResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid note, or resolved already',
  })
  @ApiResponse({ status: 404, description: 'No such report' })
  @ApiResponse({ status: 409, description: 'Someone changed it meanwhile' })
  async resolve(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
    @Body() body: ResolveReportDto,
  ): Promise<AdminReportDetailResponseDto> {
    return AdminReportDetailResponseDto.fromDomain(
      await this.reportsService.resolve(admin, id, body.note),
    );
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reopen a resolved report; the one who reopens it is responsible',
  })
  @ApiResponse({ status: 200, type: AdminReportDetailResponseDto })
  @ApiResponse({ status: 400, description: 'The report is not resolved' })
  @ApiResponse({ status: 404, description: 'No such report' })
  @ApiResponse({ status: 409, description: 'Someone changed it meanwhile' })
  async reopen(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
  ): Promise<AdminReportDetailResponseDto> {
    return AdminReportDetailResponseDto.fromDomain(
      await this.reportsService.reopen(admin, id),
    );
  }
}
