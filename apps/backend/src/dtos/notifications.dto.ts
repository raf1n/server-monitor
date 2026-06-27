import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class ListNotificationsQuery {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  offset?: string;
}
