import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { UserEntity, UserRole } from "../database/entities/user.entity";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(data: {
    username: string;
    password: string;
    email?: string;
    role?: UserRole;
  }): Promise<UserEntity> {
    const existing = await this.findByUsername(data.username);
    if (existing) throw new ConflictException("Username already taken");

    const hash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      username: data.username,
      password: hash,
      email: data.email,
      role: data.role || "viewer",
    });
    return this.userRepo.save(user);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepo.findOneBy({ username });
  }

  async findById(id: string): Promise<UserEntity | null> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return null;
    }
    return this.userRepo.findOneBy({ id });
  }

  async findByIdOrUsername(id: string): Promise<UserEntity | null> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return this.userRepo.findOneBy({ id });
    }
    return this.findByUsername(id);
  }

  async updateProfile(
    id: string,
    data: {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<UserEntity> {
    const user = await this.findByIdOrUsername(id);
    if (!user) throw new NotFoundException("User not found");

    if (data.username && data.username !== user.username) {
      const existing = await this.findByUsername(data.username);
      if (existing) throw new ConflictException("Username already taken");
      user.username = data.username;
    }

    if (data.email !== undefined) {
      user.email = data.email || undefined;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException(
          "Current password is required to set a new password",
        );
      }
      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid)
        throw new BadRequestException("Current password is incorrect");
      user.password = await bcrypt.hash(data.newPassword, 10);
    }

    return this.userRepo.save(user);
  }
}
