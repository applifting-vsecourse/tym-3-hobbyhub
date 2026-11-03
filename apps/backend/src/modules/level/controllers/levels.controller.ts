import { LevelsService } from '@/modules/level/services/levels.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LevelResponseDto } from './dto/level.response.dto';

// Public lookup data, like the activities: forms need it before anyone signs in.
@ApiTags('levels')
@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the levels a person can name for an activity they play',
  })
  @ApiResponse({ status: 200, type: [LevelResponseDto] })
  async list(): Promise<LevelResponseDto[]> {
    const levels = await this.levelsService.getSkillLevels();
    return levels.map(LevelResponseDto.fromDomain);
  }
}
