import { ReportReasonsService } from '@/modules/report-reason/services/report-reasons.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportReasonResponseDto } from './dto/report-reason.response.dto';

// Lookup data, like the cancellation reasons: the report form needs it, and
// the list says nothing about anyone.
@ApiTags('report-reasons')
@Controller('report-reasons')
export class ReportReasonsController {
  constructor(private readonly reportReasonsService: ReportReasonsService) {}

  @Get()
  @ApiOperation({
    summary: 'List what an event or a user can be reported for (#240)',
  })
  @ApiResponse({ status: 200, type: [ReportReasonResponseDto] })
  async list(): Promise<ReportReasonResponseDto[]> {
    const reasons = await this.reportReasonsService.getReportReasons();
    return reasons.map(ReportReasonResponseDto.fromDomain);
  }
}
