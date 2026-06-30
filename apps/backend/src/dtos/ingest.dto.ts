import { IsString, MinLength, IsOptional, IsNumber, Max } from 'class-validator';

export class IngestDataDto {
  @IsString()
  @MinLength(1)
  serverId!: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  intervalMs?: number;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsNumber()
  @Max(100)
  cpu?: number;

  @IsOptional()
  @IsNumber()
  @Max(100)
  memory?: number;

  @IsOptional()
  @IsNumber()
  memoryUsed?: number;

  @IsOptional()
  @IsNumber()
  memoryTotal?: number;

  @IsOptional()
  @IsNumber()
  @Max(100)
  disk?: number;

  @IsOptional()
  @IsNumber()
  diskUsed?: number;

  @IsOptional()
  @IsNumber()
  diskTotal?: number;

  @IsOptional()
  @IsNumber()
  networkIn?: number;

  @IsOptional()
  @IsNumber()
  networkOut?: number;

  @IsOptional()
  @IsNumber()
  activeProcesses?: number;

  @IsOptional()
  @IsNumber()
  uptime?: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}
