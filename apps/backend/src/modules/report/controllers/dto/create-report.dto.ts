import { CharLength } from '@/core/validation/char-length.decorator';
import {
  REPORT_TARGET_TYPES,
  REPORT_TEXT_MAX_LENGTH,
  REPORT_TEXT_MIN_LENGTH,
  ReportTargetType,
} from '@/modules/report/domain/report';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// #240, ADR-0023: what a user reports and why. Who reports comes from the
// session, never from the body.
export class CreateReportDto {
  @ApiProperty({
    enum: REPORT_TARGET_TYPES,
    description:
      'EVENT: report an event. USER: report a user and ask for the two of you to be blocked from each other.',
  })
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @ApiProperty({ description: 'The id of the event or the user' })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({ description: 'One of GET /api/report-reasons' })
  @IsString()
  @IsNotEmpty()
  reasonId!: string;

  @ApiProperty({
    example: 'Po akci mi opakovaně psal, i když jsem ho požádala, ať přestane.',
    minLength: REPORT_TEXT_MIN_LENGTH,
    maxLength: REPORT_TEXT_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @CharLength(REPORT_TEXT_MIN_LENGTH, REPORT_TEXT_MAX_LENGTH)
  text!: string;
}
