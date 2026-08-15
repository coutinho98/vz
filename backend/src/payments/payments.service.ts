import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { ReservationsService } from '../reservations/reservations.service';
import { TicketsService } from '../tickets/tickets.service';
import { PayReservationDto } from './dto/pay-reservation.dto';

/**
 * Cartões de teste oficiais da Stripe (ambiente sandbox).
 * Qualquer outro número válido é aprovado — ex.: 4242 4242 4242 4242.
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

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private reservationsService: ReservationsService,
    private ticketsService: TicketsService,
  ) {}

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

    const decline = STRIPE_TEST_DECLINES[dto.cardNumber];
    const brand = this.detectBrand(dto.cardNumber);
    const last4 = dto.cardNumber.slice(-4);

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

    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          status: 'APPROVED',
          cardBrand: brand,
          cardLast4: last4,
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
