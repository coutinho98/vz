import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@Roles('CUSTOMER')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.reservationsService.mine(user);
  }

  @Post('events/:eventId')
  create(
    @CurrentUser() user: AuthUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(user, eventId, dto);
  }

  @Delete(':id')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.cancel(user, id);
  }
}
