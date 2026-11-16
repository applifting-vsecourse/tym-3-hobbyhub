import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ReportReasonsController } from './controllers/report-reasons.controller';
import { ReportReasonRepository } from './repositories/report-reason.repository';
import { ReportReasonsService } from './services/report-reasons.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportReasonsController],
  providers: [ReportReasonsService, ReportReasonRepository],
  exports: [ReportReasonsService],
})
export class ReportReasonModule {}
