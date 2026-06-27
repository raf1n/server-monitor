import { Controller, Get, Post, Patch, Body, Req, Logger, HttpCode, HttpStatus, ForbiddenException, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';
import { RegisterUserDto, UpdateProfileDto } from '../dtos/users.dto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly users: UsersService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterUserDto) {
    const allowRegistration = process.env.ALLOW_REGISTRATION === 'true';
    if (!allowRegistration) {
      throw new ForbiddenException('Registration is disabled. Ask an admin to create your account.');
    }
    const user = await this.users.create({ ...body, role: 'viewer' });
    const { password, ...profile } = user;
    return profile;
  }

  @Post('create')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Req() req: any, @Body() body: RegisterUserDto) {
    const user = await this.users.create({ ...body, role: 'viewer' });
    const { password, ...profile } = user;
    this.logger.log(`Admin ${req.user.username} created user: ${user.username}`);
    return profile;
  }

  @Get('me')
  async getProfile(@Req() req: any) {
    const user = await this.users.findByIdOrUsername(req.user?.userId);
    if (!user) return { id: null };
    const { password, ...profile } = user;
    return profile;
  }

  @Patch('me')
  async updateProfile(
    @Req() req: any,
    @Body() body: UpdateProfileDto,
  ) {
    const user = await this.users.updateProfile(req.user?.userId, body);
    const { password, ...profile } = user;
    return profile;
  }
}
