import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.ticketsService.mine(user);
  }

  @Public()
  @Get('code/:code')
  getByCode(@Param('code') code: string) {
    return this.ticketsService.getByCode(code);
  }
}
