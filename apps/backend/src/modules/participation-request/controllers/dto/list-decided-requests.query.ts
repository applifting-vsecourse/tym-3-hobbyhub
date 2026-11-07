import {
  DECIDED_STATUSES,
  DecidedStatus,
} from '@/modules/participation-request/domain/participation-request';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ListPendingRequestsQuery } from './list-pending-requests.query';

// F-05.6: the rejected or the withdrawn requests, paged like the waiting ones.
export class ListDecidedRequestsQuery extends ListPendingRequestsQuery {
  @ApiProperty({ enum: DECIDED_STATUSES })
  @IsIn(DECIDED_STATUSES)
  status!: DecidedStatus;
}
