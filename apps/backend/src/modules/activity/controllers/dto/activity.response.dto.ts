import { Activity } from '@/modules/activity/domain/activity';
import { ApiProperty } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Florbal' })
  name!: string;

  @ApiProperty({ example: 'florbal' })
  icon!: string;

  @ApiProperty({ example: 8, description: 'Usual minimum, prefilled in forms' })
  defaultMinParticipants!: number;

  @ApiProperty({
    example: 12,
    description: 'Usual maximum, prefilled in forms',
  })
  defaultMaxParticipants!: number;

  static fromDomain(activity: Activity): ActivityResponseDto {
    return {
      id: activity.id,
      name: activity.name,
      icon: activity.icon,
      defaultMinParticipants: activity.defaultMinParticipants,
      defaultMaxParticipants: activity.defaultMaxParticipants,
    };
  }
}
