import { Level } from '@/modules/level/domain/level';
import { LevelRepository } from '@/modules/level/repositories/level.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LevelsService {
  constructor(private readonly levelRepository: LevelRepository) {}

  async getSkillLevels(): Promise<Level[]> {
    return this.levelRepository.getSkillLevels();
  }

  // Every given id is a level a person can name (one query). Duplicates count once.
  async areAllSkillLevels(ids: readonly string[]): Promise<boolean> {
    const unique = new Set(ids);
    if (unique.size === 0) return true;
    return (
      (await this.levelRepository.countSkillLevels([...unique])) === unique.size
    );
  }
}
