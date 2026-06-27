import { IsOptional, IsString, IsBooleanString, IsNumberString } from 'class-validator';

export class ListAlertsQuery {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsBooleanString()
  acknowledged?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  offset?: string;
}

export class CountAlertsQuery {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsBooleanString()
  acknowledged?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}

export class AcknowledgeAllAlertsQuery {
  @IsOptional()
  @IsString()
  serverId?: string;
}
