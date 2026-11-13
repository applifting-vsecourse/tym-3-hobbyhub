import { PrismaModule } from '@/core/prisma/prisma.module';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { adminAuthProvider } from '@/shared/admin-auth/providers/admin-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRootAsync(Config, { validate: true }),
  ],
  providers: [adminAuthProvider, AdministratorGuard],
  exports: [adminAuthProvider, AdministratorGuard],
})
export class AdminAuthModule {}
