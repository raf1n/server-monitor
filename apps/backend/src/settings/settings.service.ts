import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SettingsEntity } from '../database/entities/settings.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,
  ) {}

  private where(key: string, serverId?: string) {
    return serverId ? { key, serverId } : { key, serverId: IsNull() };
  }

  async get(key: string, serverId?: string): Promise<string | null> {
    const cacheKey = this.cacheKey(key, serverId);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    try {
      const setting = await this.settingsRepo.findOne({ where: this.where(key, serverId) });
      const value = setting?.value || null;
      if (value) this.cache.set(cacheKey, value);
      return value;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, serverId?: string): Promise<void> {
    const cacheKey = this.cacheKey(key, serverId);

    try {
      const existing = await this.settingsRepo.findOne({ where: this.where(key, serverId) });

      if (existing) {
        await this.settingsRepo.update(existing.id, { value });
      } else {
        await this.settingsRepo.save({ key, value, serverId });
      }

      this.cache.set(cacheKey, value);
    } catch (err) {
      this.logger.error(`Failed to save setting ${key}: ${(err as Error).message}`);
    }
  }

  async getAll(serverId?: string): Promise<Record<string, string>> {
    try {
      const where = serverId ? { serverId } : { serverId: IsNull() };
      const settings = await this.settingsRepo.find({ where });
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.key] = s.value;
      }
      return result;
    } catch {
      return {};
    }
  }

  async delete(key: string, serverId?: string): Promise<void> {
    const cacheKey = this.cacheKey(key, serverId);
    this.cache.delete(cacheKey);
    await this.settingsRepo.delete(this.where(key, serverId));
  }

  invalidateCache(key: string, serverId?: string): void {
    this.cache.delete(this.cacheKey(key, serverId));
  }

  private cacheKey(key: string, serverId?: string): string {
    return serverId ? `${serverId}:${key}` : `global:${key}`;
  }
}
