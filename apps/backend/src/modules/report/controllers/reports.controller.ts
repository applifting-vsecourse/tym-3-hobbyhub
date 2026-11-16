import { ReportsService } from '@/modules/report/services/reports.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResponseDto } from './dto/report.response.dto';
import { reportsValidationPipe } from './reports-validation.pipe';

// #240, ADR-0023: a signed-in user reports an event or another user. Who
// reports comes from the session.
@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(reportsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Report an event, or a user and ask for the two of you to be blocked from each other',
    description:
      'Only the administration sees the report; the reported never learns of it.',
  })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid body, an unknown reason, yourself, or an event you organize',
  })
  @ApiResponse({
    status: 404,
    description: 'No such event or user you may see',
  })
  @ApiResponse({
    status: 409,
    description: 'You have an open report about this already',
  })
  async create(
    @User() user: Identity,
    @Body() body: CreateReportDto,
  ): Promise<ReportResponseDto> {
    const report = await this.reportsService.report(user, {
      target: { type: body.targetType, id: body.targetId },
      reasonId: body.reasonId,
      text: body.text,
    });
    return ReportResponseDto.fromDomain(report);
  }
}
