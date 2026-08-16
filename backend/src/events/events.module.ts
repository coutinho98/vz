import { Module } from '@nestjs/common';
import { SeatsModule } from '../seats/seats.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [SeatsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
