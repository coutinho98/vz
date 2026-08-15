import { IsString, Length, Matches } from 'class-validator';

export class PayReservationDto {
  @IsString()
  @Length(2, 80)
  cardHolder: string;

  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'Número do cartão inválido' })
  cardNumber: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Validade deve ser MM/AA' })
  expiry: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV inválido' })
  cvv: string;
}
