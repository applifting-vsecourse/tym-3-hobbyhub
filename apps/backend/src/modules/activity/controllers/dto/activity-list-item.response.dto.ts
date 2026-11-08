import { ActivityWithCategory } from '@/modules/activity/domain/activity';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityCategoryResponseDto } from './activity-category.response.dto';
import { ActivityResponseDto } from './activity.response.dto';

// An activity in the lookup: pickers group activities by their main category.
// Events, groups and profiles keep the plain `ActivityResponseDto`.
export class ActivityListItemResponseDto extends ActivityResponseDto {
  @ApiProperty({ type: ActivityCategoryResponseDto })
  category!: ActivityCategoryResponseDto;

  static fromDomain(
    activity: ActivityWithCategory,
  ): ActivityListItemResponseDto {
    return {
      ...ActivityResponseDto.fromDomain(activity),
      category: ActivityCategoryResponseDto.fromDomain(activity.category),
    };
  }
}
