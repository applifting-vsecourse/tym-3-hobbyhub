import { PrismaService } from '@/core/prisma/prisma.service';
import { Activity as PrismaActivity } from '@/generated/prisma/client';
import { Activity } from '@/modules/activity/domain/activity';
import { Injectable } from '@nestjs/common';

const mapPrismaActivityToDomain = (activity: PrismaActivity): Activity => ({
  id: activity.id,
  name: activity.name,
  icon: activity.icon,
  defaultMinParticipants: activity.defaultMinParticipants,
  defaultMaxParticipants: activity.defaultMaxParticipants,
});

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveActivities(): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return activities.map(mapPrismaActivityToDomain);
  }

  async isActive(id: string): Promise<boolean> {
    const count = await this.prisma.activity.count({
      where: { id, isActive: true },
    });
    return count > 0;
  }
}
