import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CheckInDto } from './dto/check-in.dto';
import { GateService } from './gate.service';

@Controller('gate')
@Roles('ORGANIZER', 'GATE')
export class GateController {
  constructor(private gateService: GateService) {}

  @Get('events')
  events(@CurrentUser() user: AuthUser) {
    return this.gateService.listEvents(user);
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
