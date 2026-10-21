import { Activity } from '@/modules/activity/domain/activity';
import { ActivityRepository } from '@/modules/activity/repositories/activity.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivitiesService {
  constructor(private readonly activityRepository: ActivityRepository) {}

  async getActivities(): Promise<Activity[]> {
    return this.activityRepository.getActiveActivities();
  }

  // Every given id is an activity that is still offered (one query, not one
  // per id). Duplicates count once.
  async areAllAvailable(ids: readonly string[]): Promise<boolean> {
    const unique = new Set(ids);
    return (
      (await this.activityRepository.countActive([...unique])) === unique.size
    );
  }

  // Retired activities stay in the database for old events and groups, but
  // nothing new may be created under them.
  async isAvailable(id: string): Promise<boolean> {
    return this.activityRepository.isActive(id);
  }
}
