import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../database/entities/user.entity';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

function extractJwtFromRequest(req: Request): string | null {
  // Priority 1: httpOnly cookie (primary auth mechanism)
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // Priority 2: Authorization header (backward compat for API consumers)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ userId: string; username: string; role: UserRole }> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'username', 'role'],
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return { userId: user.id, username: user.username, role: user.role };
  }
}
