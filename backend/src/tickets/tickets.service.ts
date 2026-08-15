import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateTicketCode() {
  const bytes = randomBytes(10);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  return `ING-${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

export function normalizeTicketCode(raw: string) {
  const trimmed = raw.trim().toUpperCase();
  const fromUrl = trimmed.match(/\/T\/([A-Z0-9-]+)/);
  const code = (fromUrl ? fromUrl[1] : trimmed).replace(/\s/g, '');
  return code.startsWith('ING-') ? code : `ING-${code}`;
}

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async issueForReservation(reservation: {
    id: string;
    eventId: string;
    userId: string;
    quantity: number;
  }) {
    const event = await this.prisma.event.findUnique({
      where: { id: reservation.eventId },
      select: { seatingMode: true },
    });
    const seats = await this.prisma.seat.findMany({
      where: { reservationId: reservation.id },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });

    if (event?.seatingMode === 'SEATED') {
      return this.prisma.ticket.createManyAndReturn({
        data: seats.map((seat) => ({
          code: generateTicketCode(),
          reservationId: reservation.id,
          eventId: reservation.eventId,
          userId: reservation.userId,
          seatId: seat.id,
          seatLabel: `${seat.row}${seat.number}`,
          quantity: 1,
        })),
      });
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        code: generateTicketCode(),
        reservationId: reservation.id,
        eventId: reservation.eventId,
        userId: reservation.userId,
        quantity: reservation.quantity,
      },
    });
    return [ticket];
  }

  async mine(user: AuthUser) {
    return this.prisma.ticket.findMany({
      where: { userId: user.id, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            title: true,
            venue: true,
            city: true,
            startsAt: true,
            posterUrl: true,
            category: true,
          },
        },
      },
    });
  }

  async getByCode(rawCode: string) {
    const code = normalizeTicketCode(rawCode);
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: {
        event: {
          select: {
            title: true,
            venue: true,
            city: true,
            startsAt: true,
            posterUrl: true,
            category: true,
          },
        },
        user: { select: { name: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado');

    return {
      code: ticket.code,
      status: ticket.status,
      seatLabel: ticket.seatLabel,
      quantity: ticket.quantity,
      checkedInAt: ticket.checkedInAt,
      event: ticket.event,
      holderFirstName: ticket.user.name.split(' ')[0],
    };
  }
}
