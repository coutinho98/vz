import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SeatUpdateEvent {
  type: 'seats-updated';
}

// salas sse por evento
@Injectable()
export class SeatsBroadcastService {
  private readonly logger = new Logger(SeatsBroadcastService.name);
  private rooms = new Map<string, Subject<SeatUpdateEvent>>();

  join(eventId: string): Subject<SeatUpdateEvent> {
    let room = this.rooms.get(eventId);
    if (!room) {
      room = new Subject<SeatUpdateEvent>();
      this.rooms.set(eventId, room);
    }
    return room;
  }

  broadcast(eventId: string) {
    this.rooms.get(eventId)?.next({ type: 'seats-updated' });
  }

  activeEvents(): string[] {
    return [...this.rooms.entries()]
      .filter(([, room]) => room.observed)
      .map(([eventId]) => eventId);
  }
}
