import { CharLength } from '@/core/validation/char-length.decorator';
import {
  GROUP_SCHEDULE_MAX_LENGTH,
  GROUP_TAGLINE_MAX_LENGTH,
} from '@/modules/group/domain/group';
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { CreateGroupDto } from './create-group.dto';

// A blank text is "take it away" here, not "leave it": null for the server.
const blankToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

// ADR-0028: what the admins of a group may change; anything left out stays.
// The place cannot be taken away: every group has one.
export class UpdateGroupDto extends PartialType(
  OmitType(CreateGroupDto, ['tagline', 'usualSchedule'] as const),
) {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: GROUP_TAGLINE_MAX_LENGTH,
    description: 'null or blank removes the tagline',
  })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @CharLength(0, GROUP_TAGLINE_MAX_LENGTH)
  tagline?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: GROUP_SCHEDULE_MAX_LENGTH,
    description: 'null or blank removes the usual schedule',
  })
  @Transform(blankToNull)
  @IsOptional()
  @IsString()
  @CharLength(0, GROUP_SCHEDULE_MAX_LENGTH)
  usualSchedule?: string | null;
}
