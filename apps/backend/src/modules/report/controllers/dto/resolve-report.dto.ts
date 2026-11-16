import { CharLength } from '@/core/validation/char-length.decorator';
import {
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  REPORT_RESOLUTION_NOTE_MIN_LENGTH,
} from '@/modules/report/domain/report';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

// How the report was dealt with. Only the administration reads it; the
// reporter learns only that it was dealt with.
export class ResolveReportDto {
  @ApiProperty({
    example:
      'Dvojice zablokována, nahlášení odpovídá chování v jiných nahlášeních.',
    minLength: REPORT_RESOLUTION_NOTE_MIN_LENGTH,
    maxLength: REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @CharLength(
    REPORT_RESOLUTION_NOTE_MIN_LENGTH,
    REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  )
  note!: string;
}
