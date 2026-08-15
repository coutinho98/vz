import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { GateController } from './gate.controller';
import { GateService } from './gate.service';

@Module({
  imports: [EventsModule],
  controllers: [GateController],
  providers: [GateService],
})
export class GateModule {}
