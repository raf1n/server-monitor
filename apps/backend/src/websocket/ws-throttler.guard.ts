import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';

export interface WsThrottleOptions {
  limit: number;
  windowMs: number;
}

export const WsThrottle = Reflector.createDecorator<WsThrottleOptions>();

@Injectable()
export class WsThrottlerGuard implements CanActivate {
  private readonly stores = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.get(WsThrottle, context.getHandler())
      ?? this.reflector.get(WsThrottle, context.getClass());

    if (!options) return true;

    const client: Socket = context.switchToWs().getClient();
    const key = `${client.handshake.address}:${context.getHandler().name}`;
    const now = Date.now();

    let record = this.stores.get(key);
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + options.windowMs };
      this.stores.set(key, record);
    }

    record.count++;
    return record.count <= options.limit;
  }
}
