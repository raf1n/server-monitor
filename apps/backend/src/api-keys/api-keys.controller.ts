import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@Roles('admin')
@UseGuards(RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: { serverId?: string; label?: string }) {
    return this.apiKeys.create(body.serverId, body.label);
  }

  @Get()
  async list() {
    return this.apiKeys.list();
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    await this.apiKeys.revoke(id);
    return { revoked: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.apiKeys.delete(id);
    return { deleted: true };
  }
}
