import { FiledReport } from '@/modules/report/domain/report';
import { ApiProperty } from '@nestjs/swagger';

// What the reporter gets back: that the report arrived. Nothing of the queue.
export class ReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromDomain(report: FiledReport): ReportResponseDto {
    return { id: report.id, createdAt: report.createdAt };
  }
}
