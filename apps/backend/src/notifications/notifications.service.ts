import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  async findAll(params: {
    serverId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationEntity[]> {
    const where: Record<string, unknown> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.status) where.status = params.status;

    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(params.limit || 50, 500),
      skip: params.offset || 0,
    });
  }

  async findOne(id: string): Promise<NotificationEntity | null> {
    try {
      const notification = await this.notificationRepo.findOneBy({ id });
      return notification || null;
    } catch {
      return null;
    }
  }

  async create(data: {
    serverId?: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    destination?: string;
    meta?: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const notification = this.notificationRepo.create(data);
    return this.notificationRepo.save(notification);
  }

  async dispatchFromAlert(alert: {
    id: string;
    serverId?: string;
    title: string;
    message: string;
    severity: string;
  }): Promise<void> {
    const destinations = await this.getNotificationDestinations(alert.serverId);

    for (const dest of destinations) {
      try {
        const notification = await this.create({
          serverId: alert.serverId,
          type: dest.type,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          destination: dest.destination,
          meta: { alertId: alert.id },
        });

        await this.send(notification);
      } catch (err) {
        this.logger.error(
          `Failed to dispatch ${dest.type} notification: ${(err as Error).message}`,
        );
      }
    }
  }

  async send(notification: NotificationEntity): Promise<void> {
    switch (notification.type) {
      case 'email':
        await this.sendEmail(notification);
        break;
      case 'webhook':
        await this.sendWebhook(notification);
        break;
      case 'discord':
        await this.sendDiscord(notification);
        break;
      case 'telegram':
        await this.sendTelegram(notification);
        break;
      default:
        this.logger.warn(`Unknown notification type: ${notification.type}`);
        await this.markFailed(
          notification.id,
          `Unknown type: ${notification.type}`,
        );
        return;
    }
  }

  private async sendEmail(notification: NotificationEntity): Promise<void> {
    try {
      this.logger.log(
        `[EMAIL] To: ${notification.destination || 'default'}, Subject: ${notification.title}`,
      );
      this.logger.log(`[EMAIL] Body: ${notification.message}`);
      await this.markSent(notification.id);
    } catch (err) {
      await this.markFailed(notification.id, (err as Error).message);
    }
  }

  private async sendWebhook(notification: NotificationEntity): Promise<void> {
    try {
      const url = notification.destination || process.env.WEBHOOK_DEFAULT_URL;
      if (!url) {
        this.logger.warn('No webhook URL configured');
        await this.markFailed(notification.id, 'No webhook URL');
        return;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          serverId: notification.serverId,
          timestamp: notification.createdAt,
          meta: notification.meta,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      await this.markSent(notification.id);
    } catch (err) {
      await this.markFailed(notification.id, (err as Error).message);
    }
  }

  private async sendDiscord(notification: NotificationEntity): Promise<void> {
    try {
      const url =
        notification.destination || process.env.NOTIFICATION_DISCORD_WEBHOOK;
      if (!url) {
        this.logger.warn('Discord webhook not configured');
        await this.markFailed(
          notification.id,
          'Discord webhook not configured',
        );
        return;
      }

      const colors: Record<string, number> = {
        critical: 0xe74c3c,
        warning: 0xf39c12,
        info: 0x5865f2,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Server Monitor',
          embeds: [
            {
              title: `[${notification.severity.toUpperCase()}] ${notification.title}`,
              description: notification.message,
              color: colors[notification.severity] || 0x5865f2,
              fields: [
                {
                  name: 'Server',
                  value: notification.serverId || 'N/A',
                  inline: true,
                },
                {
                  name: 'Severity',
                  value: notification.severity,
                  inline: true,
                },
              ],
              timestamp: notification.createdAt.toISOString(),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }

      await this.markSent(notification.id);
    } catch (err) {
      await this.markFailed(notification.id, (err as Error).message);
    }
  }

  private async sendTelegram(notification: NotificationEntity): Promise<void> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = notification.destination || process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        this.logger.warn('Telegram not configured');
        await this.markFailed(notification.id, 'Telegram not configured');
        return;
      }

      const text = `*${notification.title}*\n${notification.message}\nSeverity: ${notification.severity}`;
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Telegram API returned ${response.status}`);
      }

      await this.markSent(notification.id);
    } catch (err) {
      await this.markFailed(notification.id, (err as Error).message);
    }
  }

  private async markSent(id: string): Promise<void> {
    await this.notificationRepo.update(id, { status: 'sent' });
  }

  private async markFailed(id: string, error: string): Promise<void> {
    await this.notificationRepo.update(id, {
      status: 'failed',
      meta: { error },
    });
  }

  private async getNotificationDestinations(
    serverId?: string,
  ): Promise<Array<{ type: string; destination?: string }>> {
    const destinations: Array<{ type: string; destination?: string }> = [];

    if (process.env.NOTIFICATION_EMAIL) {
      destinations.push({
        type: 'email',
        destination: process.env.NOTIFICATION_EMAIL,
      });
    }
    if (process.env.WEBHOOK_URL) {
      destinations.push({
        type: 'webhook',
        destination: process.env.WEBHOOK_URL,
      });
    }
    if (process.env.NOTIFICATION_DISCORD_WEBHOOK) {
      destinations.push({
        type: 'discord',
        destination: process.env.NOTIFICATION_DISCORD_WEBHOOK,
      });
    }
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      destinations.push({ type: 'telegram' });
    }

    return destinations;
  }

  async deleteOld(before: Date): Promise<number> {
    const result = await this.notificationRepo.delete({ createdAt: before });
    return result.affected || 0;
  }
}
