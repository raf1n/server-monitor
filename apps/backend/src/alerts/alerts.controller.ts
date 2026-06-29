import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AlertsService, Thresholds } from './alerts.service';
import { AlertEntity } from '../database/entities/alert.entity';
import { ListAlertsQuery, CountAlertsQuery, AcknowledgeAllAlertsQuery } from '../dtos/alerts.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alerts: AlertsService) {}

  @Get()
  async findAll(@Query() query: ListAlertsQuery) {
    return this.alerts.findAll({
      serverId: query.serverId,
      severity:
        query.severity && ['critical', 'warning', 'info'].includes(query.severity)
          ? query.severity
          : undefined,
      acknowledged: query.acknowledged !== undefined ? query.acknowledged === 'true' : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });
  }

  @Get('count')
  async count(@Query() query: CountAlertsQuery) {
    const count = await this.alerts.count({
      serverId: query.serverId,
      severity: query.severity,
      acknowledged: query.acknowledged !== undefined ? query.acknowledged === 'true' : undefined,
    });
    return { count };
  }

  @Get('thresholds')
  async thresholds(): Promise<Thresholds> {
    return this.alerts.loadThresholds();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.findOne(id);
  }

  @Patch(':id/acknowledge')
  async acknowledge(@Param('id', ParseUUIDPipe) id: string) {
    const alert = await this.alerts.acknowledge(id);
    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }
    return { success: true, alert };
  }

  @Patch('acknowledge-all')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async acknowledgeAll(@Query() query: AcknowledgeAllAlertsQuery) {
    const count = await this.alerts.acknowledgeAll(query.serverId);
    return { success: true, count };
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.alerts.delete(id);
  }
}
