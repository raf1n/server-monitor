import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  serverId?: string;
}

export class UpdateSettingsBulkDto {
  @IsObject()
  settings!: Record<string, string>;

  @IsOptional()
  @IsString()
  serverId?: string;
}
