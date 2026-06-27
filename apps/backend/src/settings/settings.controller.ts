import { Controller, Get, Put, Body, Query, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, UpdateSettingsBulkDto } from '../dtos/settings.dto';

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll(@Query('serverId') serverId?: string) {
    return this.settings.getAll(serverId);
  }

  @Put()
  async update(@Body() body: UpdateSettingDto) {
    await this.settings.set(body.key, body.value, body.serverId);
    return { success: true };
  }

  @Put('bulk')
  async updateBulk(@Body() body: UpdateSettingsBulkDto) {
    for (const [key, value] of Object.entries(body.settings)) {
      await this.settings.set(key, value, body.serverId);
    }
    return { success: true };
  }
}
