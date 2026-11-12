import { ActivityWithCategory } from '@/modules/activity/domain/activity';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityCategoryResponseDto } from './activity-category.response.dto';
import { ActivityResponseDto } from './activity.response.dto';

// An activity in the lookup: pickers group activities by their main category.
// Events, groups and profiles keep the plain `ActivityResponseDto`.
export class ActivityListItemResponseDto extends ActivityResponseDto {
  @ApiProperty({ type: ActivityCategoryResponseDto })
  category!: ActivityCategoryResponseDto;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1,
    description:
      'Place among the most popular activities (1 = most popular), shown first in the onboarding; null for the rest',
  })
  popularityRank!: number | null;

  static fromDomain(
    activity: ActivityWithCategory,
  ): ActivityListItemResponseDto {
    return {
      ...ActivityResponseDto.fromDomain(activity),
      category: ActivityCategoryResponseDto.fromDomain(activity.category),
      popularityRank: activity.popularityRank,
    };
  }
}
