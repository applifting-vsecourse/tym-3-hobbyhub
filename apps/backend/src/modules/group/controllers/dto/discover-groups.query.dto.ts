import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DiscoverGroupsQueryDto {
  @ApiPropertyOptional({ description: '`nextCursor` from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;
}
