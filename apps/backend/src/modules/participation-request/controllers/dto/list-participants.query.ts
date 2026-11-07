import {
  PARTICIPANT_STATUSES,
  SeatStatus,
} from '@/modules/participation-request/domain/participation-request';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ListPendingRequestsQuery } from './list-pending-requests.query';

// F-05.6, F-06.4: one state of the participants tab, paged like the requests.
export class ListParticipantsQuery extends ListPendingRequestsQuery {
  @ApiProperty({ enum: PARTICIPANT_STATUSES })
  @IsIn(PARTICIPANT_STATUSES)
  status!: SeatStatus;
}
