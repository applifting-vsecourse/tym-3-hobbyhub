import {
  ADMIN_EVENT_FILTERS,
  AdminEventFilter,
} from '@/shared/admin-auth/domain/administration';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { AdminListQuery } from './admin-list.query';

// #271: the list of events with its filter by state. Blank means no filter.
export class AdminEventsQuery extends AdminListQuery {
  @ApiPropertyOptional({
    enum: ADMIN_EVENT_FILTERS,
    description: 'Only events in this state; hidden ones by an administrator',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsOptional()
  @IsIn(ADMIN_EVENT_FILTERS)
  filter?: AdminEventFilter;
}
