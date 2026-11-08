import { ActivityCategory } from '@/modules/activity/domain/activity';
import { ApiProperty } from '@nestjs/swagger';

export class ActivityCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Míčové sporty' })
  name!: string;

  @ApiProperty({
    example: 'micove-sporty',
    description: 'Key of the category icon and translation in the frontend',
  })
  icon!: string;

  @ApiProperty({ example: 1, description: 'Position in pickers and filters' })
  order!: number;

  static fromDomain(category: ActivityCategory): ActivityCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      order: category.order,
    };
  }
}
