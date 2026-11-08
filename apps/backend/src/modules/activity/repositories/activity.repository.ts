import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Activity as PrismaActivity,
  ActivityCategory as PrismaActivityCategory,
} from '@/generated/prisma/client';
import {
  Activity,
  ActivityWithCategory,
} from '@/modules/activity/domain/activity';
import { Injectable } from '@nestjs/common';

const mapPrismaActivityToDomain = (activity: PrismaActivity): Activity => ({
  id: activity.id,
  name: activity.name,
  icon: activity.icon,
  defaultMinParticipants: activity.defaultMinParticipants,
  defaultMaxParticipants: activity.defaultMaxParticipants,
});

const mapPrismaActivityWithCategoryToDomain = (
  activity: PrismaActivity & { category: PrismaActivityCategory },
): ActivityWithCategory => ({
  ...mapPrismaActivityToDomain(activity),
  category: {
    id: activity.category.id,
    name: activity.category.name,
    icon: activity.category.icon,
    order: activity.category.order,
  },
});

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Grouped for pickers: categories in their order, activities by name within.
  async getActiveActivities(): Promise<ActivityWithCategory[]> {
    const activities = await this.prisma.activity.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    });
    return activities.map(mapPrismaActivityWithCategoryToDomain);
  }

  /** How many of the given ids are activities that are still offered. */
  async countActive(ids: readonly string[]): Promise<number> {
    return this.prisma.activity.count({
      where: { id: { in: [...ids] }, isActive: true },
    });
  }

  async isActive(id: string): Promise<boolean> {
    const count = await this.prisma.activity.count({
      where: { id, isActive: true },
    });
    return count > 0;
  }
}
