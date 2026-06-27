import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("api_keys")
export class ApiKeyEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  keyHash!: string;

  @Column({ length: 8 })
  keyPrefix!: string;

  @Column({ nullable: true })
  @Index()
  serverId?: string;

  @Column({ nullable: true })
  label?: string;

  @Column({ default: false })
  revoked!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
