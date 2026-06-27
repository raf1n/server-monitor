import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

export type NotificationType = "email" | "webhook" | "telegram";
export type NotificationStatus = "pending" | "sent" | "failed";

@Entity("notifications")
@Index(["serverId", "createdAt"])
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  @Index()
  serverId?: string;

  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column("text")
  message!: string;

  @Column()
  severity!: string;

  @Column({ default: "pending" })
  status!: string;

  @Column({ nullable: true })
  destination!: string;

  @Column({ type: "jsonb", nullable: true })
  meta!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
