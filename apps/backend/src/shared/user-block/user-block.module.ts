import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { UserBlockVisibility } from './user-block-visibility';

// #239: the read side of blocks, for every module that shows people.
@Module({
  imports: [PrismaModule],
  providers: [UserBlockVisibility],
  exports: [UserBlockVisibility],
})
export class UserBlockVisibilityModule {}
