import { PrismaModule } from '@/core/prisma/prisma.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { Module } from '@nestjs/common';
import { AdministratorsController } from './controllers/administrators.controller';
import { AdministratorRepository } from './repositories/administrator.repository';
import { AdministratorsService } from './services/administrators.service';

// ADR-0010, #238: the administrators themselves. Signing in lives in
// `shared/admin-auth`; the administration's views of events, groups and users
// live in those modules, each behind `AdministratorGuard`.
@Module({
  imports: [AdminAuthModule, PrismaModule],
  controllers: [AdministratorsController],
  providers: [AdministratorsService, AdministratorRepository],
})
export class AdministratorModule {}
