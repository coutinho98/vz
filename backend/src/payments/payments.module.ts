import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { SeatsModule } from '../seats/seats.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ReservationsModule, TicketsModule, SeatsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
