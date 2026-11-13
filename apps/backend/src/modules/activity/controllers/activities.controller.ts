import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityListItemResponseDto } from './dto/activity-list-item.response.dto';

// Public lookup data: forms and filters need it before anyone signs in.
@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List activities that can be picked, grouped by category (category order, then name)',
  })
  @ApiResponse({ status: 200, type: [ActivityListItemResponseDto] })
  async list(): Promise<ActivityListItemResponseDto[]> {
    const activities = await this.activitiesService.getActivities();
    return activities.map(ActivityListItemResponseDto.fromDomain);
  }
}
