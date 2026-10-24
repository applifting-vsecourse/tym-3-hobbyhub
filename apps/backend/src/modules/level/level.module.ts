import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { LevelsController } from './controllers/levels.controller';
import { LevelRepository } from './repositories/level.repository';
import { LevelsService } from './services/levels.service';

@Module({
  imports: [PrismaModule],
  controllers: [LevelsController],
  providers: [LevelsService, LevelRepository],
  exports: [LevelsService],
})
export class LevelModule {}
