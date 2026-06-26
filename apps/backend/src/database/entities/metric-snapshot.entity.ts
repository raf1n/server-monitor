import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('metric_snapshots')
@Index(['serverId', 'timestamp'])
export class MetricSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  serverId!: string;

  @Column('double precision')
  cpu!: number;

  @Column('double precision')
  memory!: number;

  @Column('double precision')
  memoryUsed!: number;

  @Column('double precision')
  memoryTotal!: number;

  @Column('double precision')
  disk!: number;

  @Column('double precision')
  diskUsed!: number;

  @Column('double precision')
  diskTotal!: number;

  @Column('double precision')
  networkIn!: number;

  @Column('double precision')
  networkOut!: number;

  @Column('int')
  activeProcesses!: number;

  @Column('jsonb', { nullable: true })
  loadAvg!: number[];

  @Column('int')
  uptime!: number;

  @Column('jsonb', { nullable: true })
  mounts!: Record<string, unknown>[];

  @Column('jsonb', { nullable: true })
  processes!: Record<string, unknown>[];

  @Column('jsonb', { nullable: true })
  history!: Record<string, unknown>[];

  @Column('jsonb', { nullable: true })
  alerts!: Record<string, unknown>[];

  @Column('jsonb', { nullable: true })
  raw!: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
