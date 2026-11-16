import {
  REPORT_STATUS_FILTERS,
  REPORT_TARGET_TYPES,
  ReportStatusFilter,
  ReportTargetType,
} from '@/modules/report/domain/report';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';

// A query parameter arrives as a string; only the two words count as a
// boolean, anything else stays as it came and fails `IsBoolean`.
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class AdminReportListQuery {
  @ApiPropertyOptional({
    enum: REPORT_STATUS_FILTERS,
    default: 'OPEN',
    description: 'OPEN: new and in progress. ALL: every state.',
  })
  @IsOptional()
  @IsIn(REPORT_STATUS_FILTERS)
  status: ReportStatusFilter = 'OPEN';

  @ApiPropertyOptional({ enum: REPORT_TARGET_TYPES })
  @IsOptional()
  @IsIn(REPORT_TARGET_TYPES)
  targetType?: ReportTargetType;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'true: only the reports the signed-in administrator is responsible for',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  mine?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
