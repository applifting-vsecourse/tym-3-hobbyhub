import { ReportReason } from '@/modules/report-reason/domain/report-reason';
import { ApiProperty } from '@nestjs/swagger';

export class ReportReasonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Obtěžování nebo vyhrožování' })
  name!: string;

  static fromDomain(reason: ReportReason): ReportReasonResponseDto {
    return { id: reason.id, name: reason.name };
  }
}
