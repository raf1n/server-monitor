import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

@Entity("alerts")
@Index(["serverId", "timestamp"])
export class AlertEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  @Index()
  serverId!: string;

  @Column()
  title!: string;

  @Column("text")
  message!: string;

  @Column()
  severity!: string;

  @Column({ default: "agent" })
  source!: string;

  @Column({ nullable: true })
  @Index()
  sourceId?: string;

  @Column({ default: false })
  acknowledged!: boolean;

  @Column({ type: "timestamptz" })
  timestamp!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
