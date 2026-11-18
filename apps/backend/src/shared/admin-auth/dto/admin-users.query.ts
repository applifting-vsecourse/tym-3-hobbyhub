import {
  ADMIN_USER_FILTERS,
  AdminUserFilter,
} from '@/shared/admin-auth/domain/administration';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQuery } from './admin-list.query';

// #271: the list of accounts with its smart filter. Blank means no filter.
export class AdminUsersQuery extends AdminListQuery {
  @ApiPropertyOptional({
    enum: ADMIN_USER_FILTERS,
    description: 'Only blocked, restricted or e-mail-unverified accounts',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsOptional()
  @IsIn(ADMIN_USER_FILTERS)
  filter?: AdminUserFilter;
}
