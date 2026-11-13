import { AdministratorListItem } from '@/modules/administrator/domain/administrator';
import { ApiProperty } from '@nestjs/swagger';

export class AdministratorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromDomain(
    administrator: AdministratorListItem,
  ): AdministratorResponseDto {
    return {
      id: administrator.id,
      name: administrator.name,
      email: administrator.email,
      createdAt: administrator.createdAt,
    };
  }
}
