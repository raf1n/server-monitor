import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, OnModuleInit, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { REDIS_SUBSCRIBER } from '../redis/redis.module';
import type Redis from 'ioredis';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket'],
})
export class StatsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(StatsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(@Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis) {}

  onModuleInit() {
    this.redisSub.psubscribe('stats:*', (err) => {
      if (err) {
        this.logger.error('Redis psubscribe error:', err);
        return;
      }
      this.logger.log('Subscribed to stats:* on Redis');
    });

    this.redisSub.on(
      'pmessage',
      (_pattern: string, channel: string, message: string) => {
        const serverId = channel.replace('stats:', '');
        try {
          const stats = JSON.parse(message);
          this.server
            .to(`server:${serverId}`)
            .emit('stats', { serverId, ...stats });
        } catch {
          this.logger.error(
            'Failed to parse stats message:',
            message.slice(0, 100),
          );
        }
      },
    );
  }

  emitAlert(
    serverId: string,
    alert: {
      id: string;
      title: string;
      message: string;
      severity: string;
      timestamp: Date;
      source: string;
      acknowledged: boolean;
    },
  ) {
    this.server.to(`server:${serverId}`).emit('alert', { ...alert, serverId });
  }

  handleConnection(client: Socket) {
    // Extract JWT from cookie header (httpOnly cookie) or auth handshake (fallback)
    let token: string | undefined;

    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    // Fallback: auth handshake (for non-browser clients during migration)
    if (!token) {
      token = client.handshake.auth?.token;
    }

    if (!token) {
      this.logger.warn(`Client ${client.id} disconnected — no token`);
      client.disconnect();
      return;
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      client.data.user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    } catch {
      this.logger.warn(`Client ${client.id} disconnected — invalid token`);
      client.disconnect();
      return;
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { serverId: string }) {
    const { serverId } = payload;
    if (!serverId) return;
    if (client.data.user?.role !== 'admin') {
      this.logger.warn(
        `${client.id} (${client.data.user?.role}) tried to subscribe to ${serverId} — denied`,
      );
      return;
    }

    client.join(`server:${serverId}`);
    this.logger.log(`${client.id} subscribed to ${serverId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { serverId: string }) {
    const { serverId } = payload;
    client.leave(`server:${serverId}`);
  }
}
