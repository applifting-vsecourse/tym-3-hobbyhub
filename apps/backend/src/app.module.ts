import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityModule } from './modules/activity/activity.module';
import { AdministratorModule } from './modules/administrator/administrator.module';
import { CancellationReasonModule } from './modules/cancellation-reason/cancellation-reason.module';
import { EventModule } from './modules/event/event.module';
import { FriendshipModule } from './modules/friendship/friendship.module';
import { GroupModule } from './modules/group/group.module';
import { LevelModule } from './modules/level/level.module';
import { MembershipRequestModule } from './modules/membership-request/membership-request.module';
import { MyEventsModule } from './modules/my-events/my-events.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ParticipationRequestModule } from './modules/participation-request/participation-request.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RatingModule } from './modules/rating/rating.module';
import { ReportReasonModule } from './modules/report-reason/report-reason.module';
import { ReportModule } from './modules/report/report.module';
import { UserBlockModule } from './modules/user-block/user-block.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AdminAuthModule } from './shared/admin-auth/admin-auth.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  // ADR-0021: jobs on a fixed rhythm (`@Cron`), such as the event reminders.
  ScheduleModule.forRoot(),
  AuthModule,
  // ADR-0010, #238: the administrators' sign-in, mounted in main.ts.
  AdminAuthModule,
  AdministratorModule,
  WelcomeModule,
  ActivityModule,
  CancellationReasonModule,
  EventModule,
  GroupModule,
  LevelModule,
  OnboardingModule,
  ProfileModule,
  UserBlockModule,
  EventModule,
  ParticipationRequestModule,
  MyEventsModule,
  MembershipRequestModule,
  NotificationModule,
  FriendshipModule,
  ReportReasonModule,
  ReportModule,
  // #236, ADR-0027: ratings after an event.
  RatingModule,
];

@Module({
  imports,
})
export class AppModule {}
