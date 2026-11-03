import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { CancellationReasonsController } from './controllers/cancellation-reasons.controller';
import { CancellationReasonRepository } from './repositories/cancellation-reason.repository';
import { CancellationReasonsService } from './services/cancellation-reasons.service';

@Module({
  imports: [PrismaModule],
  controllers: [CancellationReasonsController],
  providers: [CancellationReasonsService, CancellationReasonRepository],
  exports: [CancellationReasonsService],
})
export class CancellationReasonModule {}
