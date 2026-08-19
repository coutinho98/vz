import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeatsHoldService } from '../seats/seats-hold.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CatalogService } from '../catalog/catalog.service';
import {
  CreateEventDto,
  QueryEventsDto,
  UpdateEventDto,
} from './dto/event.dto';

const MAX_ROWS = 26;
const MAX_SEATS_PER_ROW = 30;
const PAGE_SIZE = 12;

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private hold: SeatsHoldService,
    private catalog: CatalogService,
  ) {}

  async create(user: AuthUser, dto: CreateEventDto) {
    const dates = (dto.sessionsAt?.length ? dto.sessionsAt : [dto.startsAt])
      .filter((d): d is string => !!d)
      .map((d) => new Date(d));
    if (dates.length === 0 || dates.some((d) => Number.isNaN(d.getTime()))) {
      throw new BadRequestException('Informe ao menos uma data de sessão válida');
    }
    const past = dates.filter((d) => d.getTime() <= Date.now());
    if (past.length > 0) {
      throw new BadRequestException(
        'Não é possível criar sessões no passado — verifique as datas',
      );
    }
    const unique = [...new Set(dates.map((d) => d.getTime()))].map(
      (t) => new Date(t),
    );

    if (dto.seatingMode === 'SEATED') {
      if (!dto.rowsCount || !dto.seatsPerRow) {
        throw new BadRequestException(
          'Eventos com assentos marcados exigem fileiras e assentos por fileira',
        );
      }
      if (dto.rowsCount > MAX_ROWS || dto.seatsPerRow > MAX_SEATS_PER_ROW) {
        throw new BadRequestException(
          `Máximo de ${MAX_ROWS} fileiras e ${MAX_SEATS_PER_ROW} assentos por fileira`,
        );
      }
    } else if (!dto.capacity) {
      throw new BadRequestException('Eventos de pista exigem capacidade');
    }

    return this.prisma.$transaction(
      unique.map((startsAt) =>
        this.prisma.event.create({
          data: {
            organizerId: user.id,
            category: dto.category,
            catalogRef: dto.catalogRef,
            title: dto.title,
            description: dto.description,
            posterUrl: dto.posterUrl ?? null,
            venue: dto.venue,
            city: dto.city,
            startsAt,
            seatingMode: dto.seatingMode,
            rowsCount: dto.rowsCount,
            seatsPerRow: dto.seatsPerRow,
            capacity: dto.capacity,
            priceCents: dto.priceCents,
            status: 'DRAFT',
            seats:
              dto.seatingMode === 'SEATED'
                ? { create: this.buildSeats(dto) }
                : undefined,
          },
          include: { _count: { select: { seats: true } } },
        }),
      ),
    );
  }

  private buildSeats(dto: CreateEventDto) {
    const seats: { row: string; number: number }[] = [];
    for (let r = 0; r < (dto.rowsCount ?? 0); r++) {
      const row = String.fromCharCode(65 + r);
      for (let n = 1; n <= (dto.seatsPerRow ?? 0); n++) {
        seats.push({ row, number: n });
      }
    }
    return seats;
  }

  // agrupa sessões de cinema do mesmo filme num cartaz só na vitrine
  private groupKey(event: {
    id: string;
    category: string;
    catalogRef: string | null;
    title: string;
    venue: string;
    city: string;
  }) {
    if (event.category !== 'MOVIE') return `single|${event.id}`;
    return `movie|${event.catalogRef ?? event.title}|${event.venue}|${event.city}`;
  }

  async listPublished(query: QueryEventsDto) {
    const page = query.page ?? 1;
    const where: Prisma.EventWhereInput = {
      status: 'PUBLISHED',
      startsAt: { gt: new Date() }, // esconde eventos passados
      ...(query.category ? { category: query.category } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { venue: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: { organizer: { select: { name: true } } },
    });

    const groups = new Map<string, typeof events>();
    for (const event of events) {
      const key = this.groupKey(event);
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }

    const items = [...groups.values()].map((sessions) => {
      const head = sessions[0];
      return {
        ...head,
        availability: this.placeholderAvailability(head),
        sessionCount: sessions.length,
        sessions: sessions.map((s) => ({ id: s.id, startsAt: s.startsAt })),
      };
    });

    const total = items.length;
    return {
      items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
    };
  }

  private placeholderAvailability(event: {
    seatingMode: string;
    rowsCount: number | null;
    seatsPerRow: number | null;
    capacity: number | null;
  }) {
    if (event.seatingMode === 'SEATED') {
      const total = (event.rowsCount ?? 0) * (event.seatsPerRow ?? 0);
      return { total, available: total };
    }
    return { total: event.capacity ?? 0, available: event.capacity ?? 0 };
  }

  async listMine(user: AuthUser) {
    const events = await this.prisma.event.findMany({
      where: { organizerId: user.id },
      orderBy: { startsAt: 'asc' },
      include: { _count: { select: { tickets: true, reservations: true } } },
    });

    const groups = new Map<string, typeof events>();
    for (const event of events) {
      const key = this.groupKey(event);
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }

    return [...groups.values()].map((sessions) => {
      const head = sessions[0];
      return {
        ...head,
        startsAt: sessions[sessions.length - 1].startsAt,
        sessionCount: sessions.length,
        sessions: sessions.map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          status: s.status,
          sold: s._count.tickets,
        })),
      };
    });
  }

  async detail(id: string) {
    await this.expireStaleReservations(id);

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { organizer: { select: { name: true } } },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const availability = await this.availability(id, event);

    // busca outras sessões do mesmo filme pro seletor de horários
    let sessions = [{ id: event.id, startsAt: event.startsAt }];
    if (event.category === 'MOVIE') {
      sessions = await this.prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          startsAt: { gt: new Date() },
          venue: event.venue,
          city: event.city,
          ...(event.catalogRef
            ? { catalogRef: event.catalogRef }
            : { title: event.title }),
        },
        orderBy: { startsAt: 'asc' },
        select: { id: true, startsAt: true },
      });
    }

    const trailer = await this.catalog.getTrailer(
      event.catalogRef ?? undefined,
      event.title,
    );

    return { ...event, availability, sessionCount: sessions.length, sessions, trailer };
  }

  async availability(
    eventId: string,
    event: { seatingMode: string; rowsCount: number | null; seatsPerRow: number | null; capacity: number | null },
  ) {
    if (event.seatingMode === 'SEATED') {
      const total = (event.rowsCount ?? 0) * (event.seatsPerRow ?? 0);
      const [taken, seatIds] = await Promise.all([
        this.prisma.seat.count({
          where: { eventId, reservationId: { not: null } },
        }),
        this.prisma.seat.findMany({
          where: { eventId, reservationId: null },
          select: { id: true },
        }),
      ]);
      const held = await this.hold.heldSeatIds(
        eventId,
        seatIds.map((s) => s.id),
      );
      return { total, available: total - taken - held.size };
    }

    const sold = await this.prisma.reservation.aggregate({
      where: { eventId, status: { in: ['PENDING', 'CONFIRMED'] } },
      _sum: { quantity: true },
    });
    const capacity = event.capacity ?? 0;
    return { total: capacity, available: capacity - (sold._sum.quantity ?? 0) };
  }

  async seatMap(eventId: string) {
    await this.expireStaleReservations(eventId);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] } },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.seatingMode !== 'SEATED') {
      throw new BadRequestException('Este evento não tem mapa de assentos');
    }

    // checa holds ativos no redis
    const held = await this.hold.heldSeatIds(
      eventId,
      event.seats.map((s) => s.id),
    );

    const rows = new Map<
      string,
      { id: string; number: number; status: 'FREE' | 'TAKEN' }[]
    >();
    for (const seat of event.seats) {
      const list = rows.get(seat.row) ?? [];
      list.push({
        id: seat.id,
        number: seat.number,
        status: seat.reservationId || held.has(seat.id) ? 'TAKEN' : 'FREE',
      });
      rows.set(seat.row, list);
    }

    return {
      seatingMode: event.seatingMode,
      category: event.category,
      rows: [...rows.entries()].map(([row, seats]) => ({ row, seats })),
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateEventDto) {
    const event = await this.getOwnedEvent(user, id);
    if (event.status !== 'DRAFT') {
      throw new BadRequestException('Apenas eventos em rascunho podem ser editados');
    }
    if (dto.startsAt && new Date(dto.startsAt).getTime() <= Date.now()) {
      throw new BadRequestException('A nova data não pode estar no passado');
    }

    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async publish(user: AuthUser, id: string) {
    const event = await this.getOwnedEvent(user, id);
    if (event.status !== 'DRAFT') {
      throw new BadRequestException('Evento já foi publicado ou cancelado');
    }
    return this.prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async cancel(user: AuthUser, id: string) {
    const event = await this.getOwnedEvent(user, id);
    if (event.status === 'CANCELLED') return event;

    await this.prisma.$transaction([
      this.prisma.reservation.updateMany({
        where: { eventId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.ticket.updateMany({
        where: { eventId: id, status: 'VALID' },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } }),
    ]);

    return this.prisma.event.findUnique({ where: { id } });
  }

  async getOwnedEvent(user: AuthUser, id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== user.id) {
      throw new ForbiddenException('Este evento não pertence a você');
    }
    return event;
  }

  async remove(user: AuthUser, id: string) {
    const event = await this.getOwnedEvent(user, id);
    if (event.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas eventos em rascunho podem ser excluídos; cancele o evento publicado',
      );
    }
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  async expireStaleReservations(eventId?: string) {
    const stale = await this.prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
        ...(eventId ? { eventId } : {}),
      },
      select: { id: true },
    });
    if (stale.length === 0) return;

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
  }
}
