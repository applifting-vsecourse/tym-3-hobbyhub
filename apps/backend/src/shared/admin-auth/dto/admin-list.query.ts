import { ADMIN_SEARCH_MAX_LENGTH } from '@/shared/admin-auth/domain/administration';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// `?q=&offset=` of every list in the administration (#238).
export class AdminListQuery {
  @ApiPropertyOptional({ maxLength: ADMIN_SEARCH_MAX_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
