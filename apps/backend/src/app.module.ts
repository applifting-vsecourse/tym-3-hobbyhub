import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { ActivityModule } from './modules/activity/activity.module';
import { EventModule } from './modules/event/event.module';
import { GroupModule } from './modules/group/group.module';
import { QuackModule } from './modules/quack/quack.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  WelcomeModule,
  QuackModule,
  ActivityModule,
  EventModule,
  GroupModule,
  EventModule,
];

@Module({
  imports,
})
export class AppModule {}
