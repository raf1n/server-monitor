import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AlertEntity } from '../database/entities/alert.entity';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
  ) {}

  async findAll(params: {
    serverId?: string;
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AlertEntity[]> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.severity) where.severity = params.severity;
    if (params.acknowledged !== undefined) where.acknowledged = params.acknowledged;

    return this.alertRepo.find({
      where,
      order: { timestamp: 'DESC' },
      take: Math.min(params.limit || 100, 500),
      skip: params.offset || 0,
    });
  }

  async count(params: { serverId?: string; acknowledged?: boolean; severity?: string }): Promise<number> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.acknowledged !== undefined) where.acknowledged = params.acknowledged;
    if (params.severity) where.severity = params.severity;
    return this.alertRepo.count({ where });
  }

  async findOne(id: string): Promise<AlertEntity | null> {
    return this.alertRepo.findOneBy({ id });
  }

  async findBySourceId(sourceId: string): Promise<AlertEntity | null> {
    return this.alertRepo.findOneBy({ sourceId });
  }

  async create(data: Partial<AlertEntity>): Promise<AlertEntity> {
    const alert = this.alertRepo.create({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return this.alertRepo.save(alert);
  }

  async acknowledge(id: string): Promise<AlertEntity | null> {
    await this.alertRepo.update(id, { acknowledged: true });
    return this.findOne(id);
  }

  async acknowledgeAll(serverId?: string): Promise<number> {
    const where: FindOptionsWhere<AlertEntity> = { acknowledged: false };
    if (serverId) where.serverId = serverId;
    const result = await this.alertRepo.update(where, { acknowledged: true });
    return result.affected || 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.alertRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async deleteOld(before: Date): Promise<number> {
    const result = await this.alertRepo.delete({ timestamp: before });
    return result.affected || 0;
  }
}
