import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKeyEntity } from '../database/entities/api-key.entity';

export interface CreateApiKeyResult {
  id: string;
  key: string; // plain text, shown only once
  keyPrefix: string;
  serverId?: string;
  label?: string;
  createdAt: Date;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly keyRepo: Repository<ApiKeyEntity>,
  ) {}

  async create(serverId?: string, label?: string): Promise<CreateApiKeyResult> {
    const rawKey = `sm_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.substring(3, 11);

    const entity = this.keyRepo.create({ keyHash, keyPrefix, serverId, label });
    const saved = await this.keyRepo.save(entity);

    this.logger.log(`API key created: ${keyPrefix}... (server: ${serverId || 'any'})`);
    return {
      id: saved.id,
      key: rawKey,
      keyPrefix: saved.keyPrefix,
      serverId: saved.serverId,
      label: saved.label,
      createdAt: saved.createdAt,
    };
  }

  async validate(key: string): Promise<{ valid: boolean; serverId?: string }> {
    // Fast path: check by prefix to narrow down candidates
    const prefix = key.substring(3, 11);
    const candidates = await this.keyRepo.find({
      where: { keyPrefix: prefix, revoked: false },
    });

    for (const candidate of candidates) {
      if (await bcrypt.compare(key, candidate.keyHash)) {
        // Update lastUsedAt (fire and forget)
        this.keyRepo.update(candidate.id, { lastUsedAt: new Date() }).catch(() => {});
        return { valid: true, serverId: candidate.serverId };
      }
    }

    return { valid: false };
  }

  async list(): Promise<Omit<ApiKeyEntity, 'keyHash'>[]> {
    const keys = await this.keyRepo.find({ order: { createdAt: 'DESC' } });
    return keys;
  }

  async revoke(id: string): Promise<void> {
    const result = await this.keyRepo.update(id, { revoked: true });
    if (result.affected === 0) throw new NotFoundException('API key not found');
    this.logger.log(`API key revoked: ${id}`);
  }

  async delete(id: string): Promise<void> {
    const result = await this.keyRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('API key not found');
    this.logger.log(`API key deleted: ${id}`);
  }
}
