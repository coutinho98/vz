import { Controller, Param, ParseUUIDPipe, Sse } from '@nestjs/common';
import { Observable, merge, interval, map } from 'rxjs';
import { Public } from '../auth/decorators/public.decorator';
import { SeatsBroadcastService } from './seats-broadcast.service';

@Controller('events')
export class SeatsStreamController {
  constructor(private broadcast: SeatsBroadcastService) {}

  @Public()
  @Sse(':id/seats/stream')
  stream(
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<{ data: unknown }> {
    const room = this.broadcast.join(id);
    // ping a cada 25s pra conexão não fechar por timeout
    const heartbeat = interval(25_000).pipe(
      map(() => ({ data: { type: 'ping' } })),
    );
    return merge(room.pipe(map((event) => ({ data: event }))), heartbeat);
  }
}
