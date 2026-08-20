import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class PayReservationDto {
  @IsOptional()
  @IsIn(['card', 'pix', 'boleto'])
  method?: 'card' | 'pix' | 'boleto';

  // obrigatorios apenas para cartao (validados no service por metodo)

  @IsOptional()
  @IsString()
  @Length(2, 80)
  cardHolder?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'Número do cartão inválido' })
  cardNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Validade deve ser MM/AA' })
  expiry?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV inválido' })
  cvv?: string;
}
