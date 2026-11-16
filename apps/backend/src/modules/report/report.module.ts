import { PrismaModule } from '@/core/prisma/prisma.module';
import { AdministratorModule } from '@/modules/administrator/administrator.module';
import { EventModule } from '@/modules/event/event.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ProfileModule } from '@/modules/profile/profile.module';
import { ReportReasonModule } from '@/modules/report-reason/report-reason.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminTargetReportsController } from './controllers/admin-target-reports.controller';
import { ReportsController } from './controllers/reports.controller';
import { ReportRepository } from './repositories/report.repository';
import { ReportsService } from './services/reports.service';

// #240, #64, #73, ADR-0023: users report events and users, the
// administration works through the reports. Asks the event and profile
// modules what the reporter may see, so nobody reports what does not exist
// for them.
@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    PrismaModule,
    ReportReasonModule,
    EventModule,
    ProfileModule,
    AdministratorModule,
    NotificationModule,
  ],
  controllers: [
    ReportsController,
    AdminReportsController,
    AdminTargetReportsController,
  ],
  providers: [ReportsService, ReportRepository],
})
export class ReportModule {}
