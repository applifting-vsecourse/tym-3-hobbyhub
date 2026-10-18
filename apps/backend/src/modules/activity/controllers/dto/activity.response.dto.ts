import { Activity } from '@/modules/activity/domain/activity';
import { ApiProperty } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Florbal' })
  name!: string;

  @ApiProperty({ example: 'florbal' })
  icon!: string;

  static fromDomain(activity: Activity): ActivityResponseDto {
    return { id: activity.id, name: activity.name, icon: activity.icon };
  }
}
