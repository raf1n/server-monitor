import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { REDIS_SUBSCRIBER } from '../redis/redis.module';
import type Redis from 'ioredis';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class StatsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis,
  ) {}

  onModuleInit() {
    this.redisSub.psubscribe('stats:*', (err) => {
      if (err) {
        console.error('Redis psubscribe error:', err);
        return;
      }
      console.log('Subscribed to stats:* on Redis');
    });

    this.redisSub.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const serverId = channel.replace('stats:', '');
      try {
        const stats = JSON.parse(message);
        this.server.to(`server:${serverId}`).emit('stats', { serverId, ...stats });
      } catch {
        console.error('Failed to parse stats message:', message.slice(0, 100));
      }
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { serverId: string }) {
    const { serverId } = payload;
    if (!serverId) return;

    client.join(`server:${serverId}`);
    console.log(`${client.id} subscribed to ${serverId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { serverId: string }) {
    const { serverId } = payload;
    client.leave(`server:${serverId}`);
  }
}
