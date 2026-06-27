import { IsObject } from 'class-validator';

export class IngestDataDto {
  @IsObject()
  data!: Record<string, unknown>;
}
