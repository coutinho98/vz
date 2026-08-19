import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SeatsModule } from '../seats/seats.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [SeatsModule, CatalogModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
