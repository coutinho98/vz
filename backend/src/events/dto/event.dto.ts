import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsIn(['MOVIE', 'SHOW'])
  category: 'MOVIE' | 'SHOW';

  @IsOptional()
  @IsString()
  catalogRef?: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  posterUrl?: string | null;

  @IsString()
  @MinLength(2)
  venue: string;

  @IsOptional()
  @IsString()
  room?: string | null;

  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(21)
  @IsISO8601({}, { each: true })
  sessionsAt?: string[];

  @IsIn(['SEATED', 'STANDING'])
  seatingMode: 'SEATED' | 'STANDING';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowsCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsPerRow?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @Type(() => Number)
  @IsInt()
  @Min(500)
  priceCents: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  venue?: string;

  @IsOptional()
  @IsString()
  room?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  priceCents?: number;
}

export class QueryEventsDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  search?: string;

  @IsOptional()
  @IsIn(['MOVIE', 'SHOW'])
  category?: 'MOVIE' | 'SHOW';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(['SEATED', 'STANDING'])
  seatingMode?: 'SEATED' | 'STANDING';

  @IsOptional()
  @IsIn(['all', 'today', 'weekend', 'week', 'month'])
  timeframe?: 'all' | 'today' | 'weekend' | 'week' | 'month';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @IsOptional()
  @IsIn(['date_asc', 'price_asc', 'price_desc', 'title_asc'])
  sortBy?: 'date_asc' | 'price_asc' | 'price_desc' | 'title_asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
