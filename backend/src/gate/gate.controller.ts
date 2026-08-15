import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventsService } from '../events/events.service';
import { CheckInDto } from './dto/check-in.dto';
import { GateService } from './gate.service';

@Controller('gate')
@Roles('ORGANIZER')
export class GateController {
  constructor(
    private gateService: GateService,
    private eventsService: EventsService,
  ) {}

  @Get('events')
  async events(@CurrentUser() user: AuthUser) {
    const events = await this.eventsService.listMine(user);
    return events.filter((event) => event.status === 'PUBLISHED');
  }

  @Post('events/:eventId/check-in')
  checkIn(
    @CurrentUser() user: AuthUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.gateService.checkIn(user, eventId, dto.code);
  }
}
