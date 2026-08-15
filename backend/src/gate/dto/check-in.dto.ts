import { IsString, Length } from 'class-validator';

export class CheckInDto {
  @IsString()
  @Length(4, 200)
  code: string;
}
