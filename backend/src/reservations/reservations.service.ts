import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeatsBroadcastService } from '../seats/seats-broadcast.service';
import { SeatsHoldService } from '../seats/seats-hold.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';

const HOLD_SECONDS = Number(process.env.RESERVATION_HOLD_SECONDS ?? 600);

export function halfPriceOf(priceCents: number) {
  return Math.round(priceCents / 2);
}

export function reservationTotal(
  priceCents: number,
  count: number,
  halfCount: number,
) {
  const full = count - halfCount;
  return full * priceCents + halfCount * halfPriceOf(priceCents);
}

@Injectable()
export class ReservationsService implements OnModuleInit {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private hold: SeatsHoldService,
    private broadcast: SeatsBroadcastService,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    // escuta expirações do redis pra liberar assentos vencidos e avisar no sse
    this.redisService.keyExpired$.subscribe((key) => {
      const eventId = SeatsHoldService.eventIdFromKey(key);
      if (!eventId) return;
      void this.expireStale(eventId)
        .then(() => this.broadcast.broadcast(eventId))
        .catch((err) => this.logger.warn(`expiração ${key}: ${err.message}`));
    });
  }

  async create(user: AuthUser, eventId: string, dto: CreateReservationDto) {
    await this.expireStale(eventId);

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Evento não está publicado');
    }
    if (event.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Este evento já aconteceu');
    }

    if (event.seatingMode === 'SEATED') {
      if (!dto.seatIds?.length) {
        throw new BadRequestException('Selecione pelo menos um assento');
      }
      const halfCount = Math.min(dto.halfCount ?? 0, dto.seatIds.length);
      return this.createSeated(
        user,
        event.id,
        event.priceCents,
        dto.seatIds,
        halfCount,
      );
    }

    if (!dto.quantity) {
      throw new BadRequestException('Informe a quantidade de ingressos');
    }
    const halfCount = Math.min(dto.halfCount ?? 0, dto.quantity);
    return this.createStanding(
      user,
      event.id,
      event.priceCents,
      dto.quantity,
      halfCount,
      event.capacity ?? 0,
    );
  }

  private async createSeated(
    user: AuthUser,
    eventId: string,
    priceCents: number,
    seatIds: string[],
    halfCount: number,
  ) {
    // tenta lock rapido no redis primeiro
    const reservationId = randomUUID();
    const locked = await this.hold.hold(
      eventId,
      seatIds,
      reservationId,
      HOLD_SECONDS,
    );
    if (!locked) {
      throw new ConflictException(
        'Um ou mais assentos acabaram de ser reservados',
      );
    }

    try {
      // reserva no banco com update condicional (row-lock)
      const reservation = await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({
          data: {
            id: reservationId,
            userId: user.id,
            eventId,
            quantity: seatIds.length,
            halfCount,
            totalCents: reservationTotal(priceCents, seatIds.length, halfCount),
            expiresAt: new Date(Date.now() + HOLD_SECONDS * 1000),
          },
        });

        const taken = await tx.seat.updateMany({
          where: {
            id: { in: seatIds },
            eventId,
            reservationId: null,
          },
          data: { reservationId: reservation.id },
        });
        if (taken.count !== seatIds.length) {
          throw new ConflictException(
            'Um ou mais assentos acabaram de ser reservados',
          );
        }

        return tx.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
          include: {
            event: { select: { id: true, title: true, venue: true, city: true, startsAt: true, posterUrl: true } },
            seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
          },
        });
      });

      this.broadcast.broadcast(eventId);
      return reservation;
    } catch (err) {
      // se deu erro no postgres, limpa o lock do redis
      await this.hold.release(eventId, seatIds);
      throw err;
    }
  }

  private async createStanding(
    user: AuthUser,
    eventId: string,
    priceCents: number,
    quantity: number,
    halfCount: number,
    capacity: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sold = await tx.reservation.aggregate({
        where: { eventId, status: { in: ['PENDING', 'CONFIRMED'] } },
        _sum: { quantity: true },
      });
      const used = sold._sum.quantity ?? 0;
      if (used + quantity > capacity) {
        throw new ConflictException('Ingressos de pista esgotados para esta quantidade');
      }

      return tx.reservation.create({
        data: {
          userId: user.id,
          eventId,
          quantity,
          halfCount,
          totalCents: reservationTotal(priceCents, quantity, halfCount),
          expiresAt: new Date(Date.now() + HOLD_SECONDS * 1000),
        },
        include: {
          event: { select: { title: true, venue: true, city: true, startsAt: true, posterUrl: true } },
        },
      });
    });
  }

  async mine(user: AuthUser) {
    await this.expireStale();
    return this.prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, title: true, venue: true, city: true, startsAt: true, posterUrl: true } },
        seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
      },
    });
  }

  async getById(user: AuthUser, id: string) {
    await this.expireStale();
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true, venue: true, city: true, startsAt: true, posterUrl: true } },
        seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
      },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    if (reservation.userId !== user.id) {
      throw new ForbiddenException('Esta reserva não pertence a você');
    }
    return reservation;
  }

  async cancel(user: AuthUser, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { seats: { select: { id: true } } },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    if (reservation.userId !== user.id) {
      throw new ForbiddenException('Esta reserva não pertence a você');
    }
    if (reservation.status !== 'PENDING') {
      throw new BadRequestException('Apenas reservas pendentes podem ser canceladas');
    }

    await this.prisma.$transaction([
      this.prisma.seat.updateMany({
        where: { reservationId: reservation.id },
        data: { reservationId: null },
      }),
      this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED' },
      }),
    ]);
    await this.hold.release(
      reservation.eventId,
      reservation.seats.map((s) => s.id),
    );
    this.broadcast.broadcast(reservation.eventId);

    return { cancelled: true };
  }

  async expireStale(eventId?: string): Promise<string[]> {
    const stale = await this.prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
        ...(eventId ? { eventId } : {}),
      },
      select: { id: true, eventId: true },
    });
    if (stale.length === 0) return [];

    await this.prisma.$transaction([
      this.prisma.seat.updateMany({
        where: { reservationId: { in: stale.map((r) => r.id) } },
        data: { reservationId: null },
      }),
      this.prisma.reservation.updateMany({
        where: { id: { in: stale.map((r) => r.id) } },
        data: { status: 'CANCELLED' },
      }),
    ]);

    return [...new Set(stale.map((r) => r.eventId))];
  }
}
