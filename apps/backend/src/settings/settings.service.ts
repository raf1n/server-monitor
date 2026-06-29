import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SettingsEntity } from '../database/entities/settings.entity';

interface CacheEntry {
  value: string;
  ttl: number;
}

@Injectable()
export class SettingsService implements OnModuleDestroy {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60_000;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,
  ) {
    this.cleanupTimer = setInterval(() => this.evictStale(), 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  private where(key: string, serverId?: string) {
    return serverId ? { key, serverId } : { key, serverId: IsNull() };
  }

  async get(key: string, serverId?: string): Promise<string | null> {
    const cacheKey = this.cacheKey(key, serverId);
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.ttl) {
      return entry.value;
    }
    if (entry) this.cache.delete(cacheKey);

    try {
      const setting = await this.settingsRepo.findOne({
        where: this.where(key, serverId),
      });

      const value = setting?.value || null;
      if (value) {
        this.cache.set(cacheKey, {
          value,
          ttl: Date.now() + this.CACHE_TTL_MS,
        });
      }
      return value;
    } catch (err) {
      this.logger.error(
        `Failed to get setting ${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, serverId?: string): Promise<void> {
    const cacheKey = this.cacheKey(key, serverId);

    try {
      const existing = await this.settingsRepo.findOne({
        where: this.where(key, serverId),
      });

      if (existing) {
        await this.settingsRepo.update(existing.id, { value });
      } else {
        await this.settingsRepo.save({ key, value, serverId });
      }

      this.cache.set(cacheKey, { value, ttl: Date.now() + this.CACHE_TTL_MS });
    } catch (err) {
      this.logger.error(
        `Failed to save setting ${key}: ${(err as Error).message}`,
      );
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
    } catch (err) {
      this.logger.error(
        `Failed to get all settings: ${(err as Error).message}`,
      );
      return {};
    }
  }

  async delete(key: string, serverId?: string): Promise<void> {
    const cacheKey = this.cacheKey(key, serverId);
    this.cache.delete(cacheKey);
    try {
      await this.settingsRepo.delete(this.where(key, serverId));
    } catch (err) {
      this.logger.error(
        `Failed to delete setting ${key}: ${(err as Error).message}`,
      );
    }
  }

  invalidateCache(key: string, serverId?: string): void {
    this.cache.delete(this.cacheKey(key, serverId));
  }

  private evictStale() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.ttl) this.cache.delete(key);
    }
  }

  private cacheKey(key: string, serverId?: string): string {
    return serverId ? `${serverId}:${key}` : `global:${key}`;
  }
}
