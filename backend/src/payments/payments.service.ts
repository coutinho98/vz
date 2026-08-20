import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { ReservationsService } from '../reservations/reservations.service';
import { SeatsHoldService } from '../seats/seats-hold.service';
import { TicketsService } from '../tickets/tickets.service';
import { PayReservationDto } from './dto/pay-reservation.dto';

/**
 * Cartões de teste oficiais da Stripe (ambiente sandbox).
 * Qualquer outro número válido é aprovado - ex.: 4242 4242 4242 4242.
 * https://docs.stripe.com/testing
 */
const STRIPE_TEST_DECLINES: Record<string, { code: string; message: string }> = {
  '4000000000000002': {
    code: 'card_declined',
    message: 'Cartão recusado pela operadora (card_declined).',
  },
  '4000000000009995': {
    code: 'insufficient_funds',
    message: 'Saldo insuficiente no cartão (insufficient_funds).',
  },
  '4000000000009987': {
    code: 'lost_card',
    message: 'Cartão reportado como perdido (lost_card).',
  },
  '4000000000000069': {
    code: 'expired_card',
    message: 'Cartão expirado (expired_card).',
  },
  '4000000000000127': {
    code: 'incorrect_cvc',
    message: 'Código de segurança incorreto (incorrect_cvc).',
  },
};

// gera um "copia e cola" de pix plausivel (nao valido de verdade)
function fakePixPayload(reservationId: string, cents: number) {
  const amount = cents.toFixed(2).padStart(10, '0');
  return (
    `00020126580014BR.GOV.BCB.PIX0136${randomUUID()}` +
    `5204000053039865405${amount}` +
    `5802BR5915VZ INGRESSOS6009SAO PAULO` +
    `62070503${reservationId.slice(0, 5).toUpperCase()}` +
    `6304${randomBytes(2).toString('hex').toUpperCase()}`
  );
}

// linha digitavel de boleto com cara de verdade (44 digitos)
function fakeBoletoCode(cents: number) {
  const amount = cents.toFixed(2).replace(/\D/g, '').padStart(10, '0');
  const body = `34191${randomInt(4)}${amount}` + randomDigits(25);
  return body + randomDigits(44 - body.length);
}

function randomDigits(n: number) {
  return Array.from(randomBytes(n))
    .map((b) => b % 10)
    .join('')
    .slice(0, n);
}

function randomInt(n: number) {
  return String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private reservationsService: ReservationsService,
    private ticketsService: TicketsService,
    private hold: SeatsHoldService,
  ) {}

  // gera o "instrumento" de pagamento sem confirmar nada (pix/boleto)
  async createIntent(user: AuthUser, reservationId: string, dto: PayReservationDto) {
    const reservation = await this.getPayableReservation(user, reservationId);
    const method = dto.method ?? 'card';

    if (method === 'pix') {
      const code = fakePixPayload(reservation.id, reservation.totalCents);
      return {
        method,
        pixCode: code,
        expiresAt: new Date(reservation.expiresAt).toISOString(),
        amountCents: reservation.totalCents,
      };
    }

    if (method === 'boleto') {
      return {
        method,
        boletoCode: fakeBoletoCode(reservation.totalCents),
        boletoFormatted: fakeBoletoCode(reservation.totalCents).replace(
          /(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{12})/,
          '$1.$2 $3.$4 $5.$6 $7 $8',
        ),
        expiresAt: new Date(reservation.expiresAt).toISOString(),
        amountCents: reservation.totalCents,
      };
    }

    throw new BadRequestException('Intent disponível apenas para pix ou boleto');
  }

  async pay(user: AuthUser, reservationId: string, dto: PayReservationDto) {
    await this.reservationsService.expireStale();

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { event: true, seats: true },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    if (reservation.userId !== user.id) {
      throw new ForbiddenException('Esta reserva não pertence a você');
    }
    if (reservation.status === 'CANCELLED') {
      throw new BadRequestException('Reserva expirada ou cancelada');
    }
    if (reservation.status === 'CONFIRMED') {
      throw new BadRequestException('Reserva já foi paga');
    }

    const method = dto.method ?? 'card';

    if (method === 'card') {
      return this.payWithCard(reservation, dto);
    }
    // pix/boleto: a "confirmacao" chega aqui como se fosse o webhook do PSP
    return this.approve(reservation, method, method === 'pix' ? 'Pix' : 'Boleto');
  }

  private async getPayableReservation(user: AuthUser, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');
    if (reservation.userId !== user.id) {
      throw new ForbiddenException('Esta reserva não pertence a você');
    }
    if (reservation.status !== 'PENDING') {
      throw new BadRequestException('Reserva não está pendente');
    }
    return reservation;
  }

  private async payWithCard(
    reservation: {
      id: string;
      eventId: string;
      userId: string;
      quantity: number;
      halfCount?: number;
      totalCents: number;
      seats: { id: string }[];
    },
    dto: PayReservationDto,
  ) {
    if (!dto.cardHolder || !dto.cardNumber || !dto.expiry || !dto.cvv) {
      throw new BadRequestException('Preencha todos os dados do cartão');
    }

    // normaliza: o numero pode chegar com ou sem espaços (4242 4242… vs 42424242…)
    const digits = dto.cardNumber.replace(/\D/g, '');
    const decline = STRIPE_TEST_DECLINES[digits] ?? STRIPE_TEST_DECLINES[dto.cardNumber];
    const brand = this.detectBrand(digits);
    const last4 = digits.slice(-4);

    if (decline) {
      const payment = await this.prisma.payment.create({
        data: {
          reservationId: reservation.id,
          status: 'DECLINED',
          cardBrand: brand,
          cardLast4: last4,
          amountCents: reservation.totalCents,
        },
      });
      return {
        outcome: 'DECLINED',
        declineCode: decline.code,
        declineMessage: decline.message,
        payment,
        tickets: [],
      };
    }

    return this.approve(reservation, 'card', brand, last4);
  }

  // confirma o pagamento, emite ingressos e libera os locks do redis
  private async approve(
    reservation: {
      id: string;
      eventId: string;
      userId: string;
      quantity: number;
      halfCount?: number;
      totalCents: number;
      seats: { id: string }[];
    },
    method: string,
    brand: string,
    last4?: string,
  ) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          status: 'APPROVED',
          method,
          cardBrand: brand,
          cardLast4: last4 ?? null,
          amountCents: reservation.totalCents,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' },
      });

      return payment;
    });

    const tickets = await this.ticketsService.issueForReservation(reservation);
    // libera o lock temporário do redis já que tá confirmado no banco
    await this.hold.release(
      reservation.eventId,
      reservation.seats.map((s) => s.id),
    );
    return { outcome: 'APPROVED', payment, tickets };
  }

  private detectBrand(cardNumber: string) {
    if (cardNumber.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cardNumber)) return 'Mastercard';
    if (/^3[47]/.test(cardNumber)) return 'Amex';
    if (cardNumber.startsWith('6')) return 'Elo';
    return 'Cartão';
  }
}
