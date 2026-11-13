import { PrismaModule } from '@/core/prisma/prisma.module';
import { OnboardingModule } from '@/modules/onboarding/onboarding.module';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AdminUsersController } from './controllers/admin-users.controller';
import { ProfileController } from './controllers/profile.controller';
import { ProfileRepository } from './repositories/profile.repository';
import { ProfileService } from './services/profile.service';

@Module({
  imports: [AuthModule, AdminAuthModule, PrismaModule, OnboardingModule],
  controllers: [ProfileController, AdminUsersController],
  providers: [ProfileService, ProfileRepository],
})
export class ProfileModule {}
