import { LevelRepository } from '@/modules/level/repositories/level.repository';
import { mock } from 'jest-mock-extended';
import { LevelsService } from './levels.service';

describe('LevelsService', () => {
  const setup = (
    found: number,
  ): {
    repository: ReturnType<typeof mock<LevelRepository>>;
    service: LevelsService;
  } => {
    const repository = mock<LevelRepository>();
    repository.countSkillLevels.mockResolvedValue(found);
    return { repository, service: new LevelsService(repository) };
  };

  it('accepts ids that are all levels a person can name', async () => {
    const { service } = setup(2);
    await expect(service.areAllSkillLevels(['l1', 'l2'])).resolves.toBe(true);
  });

  it('refuses when one of the ids is not such a level', async () => {
    const { service } = setup(1);
    await expect(service.areAllSkillLevels(['l1', 'l2'])).resolves.toBe(false);
  });

  it('counts a repeated id once and asks nothing for none', async () => {
    const { repository, service } = setup(1);
    await expect(service.areAllSkillLevels(['l1', 'l1'])).resolves.toBe(true);
    expect(repository.countSkillLevels).toHaveBeenCalledWith(['l1']);

    const none = setup(0);
    await expect(none.service.areAllSkillLevels([])).resolves.toBe(true);
    expect(none.repository.countSkillLevels).not.toHaveBeenCalled();
  });
});
