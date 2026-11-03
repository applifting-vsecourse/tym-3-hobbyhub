import { PrismaService } from '@/core/prisma/prisma.service';
import { Level } from '@/modules/level/domain/level';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LevelRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The levels a person can name for themselves, easiest first. */
  async getSkillLevels(): Promise<Level[]> {
    const levels = await this.prisma.level.findMany({
      where: { isSkillLevel: true },
      orderBy: { order: 'asc' },
    });
    return levels.map((level) => ({ id: level.id, name: level.name }));
  }

  async countSkillLevels(ids: readonly string[]): Promise<number> {
    return this.prisma.level.count({
      where: { id: { in: [...ids] }, isSkillLevel: true },
    });
  }
}
