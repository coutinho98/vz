import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { EventsService } from '../events/events.service';
import { normalizeTicketCode } from '../tickets/tickets.service';

export type CheckInResult = {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID';
  reason?: 'NOT_FOUND' | 'WRONG_EVENT' | 'CANCELLED';
  message: string;
  ticket?: {
    code: string;
    seatLabel: string | null;
    quantity: number;
    holderFirstName: string;
    checkedInAt: Date | null;
  };
};

@Injectable()
export class GateService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  // portaria valida tudo; organizador só os eventos dele
  async listEvents(user: AuthUser) {
    if (user.role === 'GATE') {
      return this.prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { startsAt: 'asc' },
        include: { _count: { select: { tickets: true } } },
      });
    }
    const mine = await this.eventsService.listMine(user);
    return mine.filter((event) => event.status === 'PUBLISHED');
  }

  async checkIn(
    user: AuthUser,
    eventId: string,
    rawCode: string,
  ): Promise<CheckInResult> {
    await this.assertGateAccess(user, eventId);

    const code = normalizeTicketCode(rawCode);
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: { user: { select: { name: true } } },
    });

    if (!ticket) {
      return {
        status: 'INVALID',
        reason: 'NOT_FOUND',
        message: 'Ingresso inexistente. Código não encontrado.',
      };
    }

    if (ticket.eventId !== eventId) {
      const target = await this.prisma.event.findUnique({
        where: { id: ticket.eventId },
        select: { title: true },
      });
      return {
        status: 'INVALID',
        reason: 'WRONG_EVENT',
        message: `Ingresso inválido para este evento. Pertence a: ${target?.title ?? 'outro evento'}.`,
      };
    }

    if (ticket.status === 'CANCELLED') {
      return {
        status: 'INVALID',
        reason: 'CANCELLED',
        message: 'Ingresso cancelado (evento cancelado ou reserva extornada).',
      };
    }

    if (ticket.status === 'USED') {
      return {
        status: 'ALREADY_USED',
        message: `Ingresso já utilizado em ${this.formatDateTime(ticket.checkedInAt)}.`,
        ticket: this.toTicketDto(ticket),
      };
    }

    // update condicional atômico: se duas catracas baterem juntas, só uma atualiza
    const claimed = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', checkedInAt: new Date() },
    });
    if (claimed.count === 0) {
      const fresh = await this.prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: { user: { select: { name: true } } },
      });
      return {
        status: 'ALREADY_USED',
        message: `Ingresso já utilizado em ${this.formatDateTime(fresh.checkedInAt)}.`,
        ticket: this.toTicketDto(fresh),
      };
    }

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: {
        user: { select: { name: true } },
        seat: { select: { row: true } },
        event: { select: { room: true } },
      },
    });

    // pcd = assento na última fileira do mapa (mesma regra da disponibilidade)
    const seatRows = await this.prisma.seat.groupBy({
      by: ['row'],
      where: { eventId: ticket.eventId },
    });
    const lastRow = seatRows
      .map((s) => s.row)
      .sort()
      .pop();
    const isPcdSeat = !!updated.seat && updated.seat.row === lastRow;
    const roomPrefix = updated.event.room ? `${updated.event.room} · ` : '';
    return {
      status: 'VALID',
      message: `Entrada liberada - ${roomPrefix}${updated.seatLabel ? `Assento ${updated.seatLabel}` : 'pista'}${
        isPcdSeat ? ' · PCD: espaço acessível' : ''
      }${updated.kind === 'HALF' ? ' · MEIA: verificar documento' : ''}.`,
      ticket: this.toTicketDto(updated),
    };
  }

  private async assertGateAccess(user: AuthUser, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');

    if (user.role === 'GATE') {
      if (event.status !== 'PUBLISHED') {
        throw new BadRequestException('Evento não está publicado');
      }
      return event;
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException('Este evento não pertence a você');
    }
    return event;
  }

  private toTicketDto(ticket: {
    code: string;
    seatLabel: string | null;
    quantity: number;
    kind: string;
    checkedInAt: Date | null;
    user: { name: string };
  }) {
    return {
      code: ticket.code,
      seatLabel: ticket.seatLabel,
      quantity: ticket.quantity,
      kind: ticket.kind,
      holderFirstName: ticket.user.name.split(' ')[0],
      checkedInAt: ticket.checkedInAt,
    };
  }

  private formatDateTime(date: Date | null) {
    if (!date) return 'data desconhecida';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
