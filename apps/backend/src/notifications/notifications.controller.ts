import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQuery } from '../dtos/notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async findAll(@Query() query: ListNotificationsQuery) {
    return this.notifications.findAll({
      serverId: query.serverId,
      status: query.status,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.findOne(id);
  }
}
