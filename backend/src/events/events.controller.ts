import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateEventDto,
  QueryEventsDto,
  UpdateEventDto,
} from './dto/event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Roles('ORGANIZER')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.eventsService.listMine(user);
  }

  @Roles('ORGANIZER')
  @Get('mine/stats')
  mineStats(@CurrentUser() user: AuthUser) {
    return this.eventsService.stats(user);
  }

  @Public()
  @Get()
  list(@Query() query: QueryEventsDto) {
    return this.eventsService.listPublished(query);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.detail(id);
  }

  @Public()
  @Get(':id/seats')
  seatMap(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.seatMap(id);
  }

  @Roles('ORGANIZER')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user, dto);
  }

  @Roles('ORGANIZER')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user, id, dto);
  }

  @Roles('ORGANIZER')
  @Post(':id/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.publish(user, id);
  }

  @Roles('ORGANIZER')
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.cancel(user, id);
  }

  @Roles('ORGANIZER')
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.remove(user, id);
  }
}
