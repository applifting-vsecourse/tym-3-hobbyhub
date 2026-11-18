import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGroupDto } from './create-group.dto';

// ADR-0028: what the admins of a group may change; anything left out stays.
export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ description: 'Remove the place and its position' })
  @IsOptional()
  @IsBoolean()
  clearLocation?: boolean;
}
