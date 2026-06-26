import { Controller, Get, Put, Body, Query, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll(@Query('serverId') serverId?: string) {
    return this.settings.getAll(serverId);
  }

  @Put()
  async update(
    @Body() body: { key: string; value: string; serverId?: string },
  ) {
    await this.settings.set(body.key, body.value, body.serverId);
    return { success: true };
  }
}
