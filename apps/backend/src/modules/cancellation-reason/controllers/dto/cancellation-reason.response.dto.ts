import { CancellationReason } from '@/modules/cancellation-reason/domain/cancellation-reason';
import { ApiProperty } from '@nestjs/swagger';

export class CancellationReasonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Nedostatek účastníků' })
  name!: string;

  static fromDomain(reason: CancellationReason): CancellationReasonResponseDto {
    return { id: reason.id, name: reason.name };
  }
}
