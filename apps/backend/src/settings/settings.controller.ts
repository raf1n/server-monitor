import { Controller, Get, Put, Body, Query, Logger, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, UpdateSettingsBulkDto } from '../dtos/settings.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll(@Query('serverId') serverId?: string) {
    return this.settings.getAll(serverId);
  }

  @Put()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async update(@Body() body: UpdateSettingDto) {
    await this.settings.set(body.key, body.value, body.serverId);
    return { success: true };
  }

  @Put('bulk')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async updateBulk(@Body() body: UpdateSettingsBulkDto) {
    for (const [key, value] of Object.entries(body.settings)) {
      await this.settings.set(key, value, body.serverId);
    }
    return { success: true };
  }
}
