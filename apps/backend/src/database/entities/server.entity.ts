import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('servers')
export class ServerEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  host!: string;

  @Column({ default: 'dynamic' })
  region!: string;

  @Column({ default: 'online' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeen!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
