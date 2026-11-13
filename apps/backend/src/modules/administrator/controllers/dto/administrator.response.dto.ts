import {
  AdministratorListItem,
  AdministratorRef,
  AdministratorStatus,
} from '@/modules/administrator/domain/administrator';
import { ApiProperty } from '@nestjs/swagger';

const STATUSES: AdministratorStatus[] = ['INVITED', 'ACTIVE', 'DEACTIVATED'];

export class AdministratorRefResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

const refOf = (
  ref: AdministratorRef | null,
): AdministratorRefResponseDto | null => ref && { id: ref.id, name: ref.name };

export class AdministratorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    enum: STATUSES,
    description: 'INVITED until they set a password (ADR-0021)',
  })
  status!: AdministratorStatus;

  @ApiProperty({
    type: AdministratorRefResponseDto,
    nullable: true,
    description: 'Who invited them; null for the first one',
  })
  createdBy!: AdministratorRefResponseDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  deactivatedAt!: Date | null;

  @ApiProperty({ type: AdministratorRefResponseDto, nullable: true })
  deactivatedBy!: AdministratorRefResponseDto | null;

  static fromDomain(
    administrator: AdministratorListItem,
  ): AdministratorResponseDto {
    return {
      id: administrator.id,
      name: administrator.name,
      email: administrator.email,
      createdAt: administrator.createdAt,
      status: administrator.status,
      createdBy: refOf(administrator.createdBy),
      deactivatedAt: administrator.deactivatedAt,
      deactivatedBy: refOf(administrator.deactivatedBy),
    };
  }
}
