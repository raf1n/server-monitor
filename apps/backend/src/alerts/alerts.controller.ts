import { Controller, Get, Patch, Delete, Param, Query, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertEntity } from '../database/entities/alert.entity';

@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alerts: AlertsService) {}

  @Get()
  async findAll(
    @Query('serverId') serverId?: string,
    @Query('severity') severity?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.alerts.findAll({
      serverId,
      severity: severity && ['critical', 'warning', 'info'].includes(severity) ? severity : undefined,
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('count')
  async count(
    @Query('serverId') serverId?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('severity') severity?: string,
  ) {
    const count = await this.alerts.count({
      serverId,
      severity,
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
    });
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.alerts.findOne(id);
  }

  @Patch(':id/acknowledge')
  async acknowledge(@Param('id') id: string) {
    const alert = await this.alerts.acknowledge(id);
    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }
    return { success: true, alert };
  }

  @Patch('acknowledge-all')
  async acknowledgeAll(@Query('serverId') serverId?: string) {
    const count = await this.alerts.acknowledgeAll(serverId);
    return { success: true, count };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.alerts.delete(id);
  }
}
