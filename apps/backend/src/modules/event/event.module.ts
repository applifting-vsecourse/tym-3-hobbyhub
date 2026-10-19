import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { EventsController } from './controllers/events.controller';
import { EventRepository } from './repositories/event.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [EventsService, EventRepository],
})
export class EventModule {}
