import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class ListMetricsQuery {
  @IsOptional()
  @IsString()
  range?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
