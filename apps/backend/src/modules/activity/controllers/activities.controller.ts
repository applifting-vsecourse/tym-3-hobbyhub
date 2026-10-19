import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityResponseDto } from './dto/activity.response.dto';

// Public lookup data: forms and filters need it before anyone signs in.
@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List activities that can be picked' })
  @ApiResponse({ status: 200, type: [ActivityResponseDto] })
  async list(): Promise<ActivityResponseDto[]> {
    const activities = await this.activitiesService.getActivities();
    return activities.map(ActivityResponseDto.fromDomain);
  }
}
