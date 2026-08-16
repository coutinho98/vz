import { Module } from '@nestjs/common';
import { SeatsBroadcastService } from './seats-broadcast.service';
import { SeatsHoldService } from './seats-hold.service';
import { SeatsStreamController } from './seats-stream.controller';

@Module({
  controllers: [SeatsStreamController],
  providers: [SeatsHoldService, SeatsBroadcastService],
  exports: [SeatsHoldService, SeatsBroadcastService],
})
export class SeatsModule {}
