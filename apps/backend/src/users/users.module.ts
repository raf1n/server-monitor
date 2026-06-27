import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../database/entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  private readonly logger = new Logger(UsersModule.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepo.count();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin';
      const hash = await bcrypt.hash(password, 10);
      await this.userRepo.save({ username, password: hash, role: 'admin' });
      this.logger.log(`Default admin user created: ${username}`);
    } else {
      // Ensure at least one admin exists (for existing databases migrating to roles)
      const adminCount = await this.userRepo.count({ where: { role: 'admin' as any } });
      if (adminCount === 0) {
        const firstUser = await this.userRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
        if (firstUser) {
          firstUser.role = 'admin';
          await this.userRepo.save(firstUser);
          this.logger.log(`Promoted existing user to admin: ${firstUser.username}`);
        }
      }
    }
  }
}
