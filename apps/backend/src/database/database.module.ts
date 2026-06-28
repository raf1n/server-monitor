import { Module, Global, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerEntity } from "./entities/server.entity";
import { MetricSnapshotEntity } from "./entities/metric-snapshot.entity";
import { AlertEntity } from "./entities/alert.entity";
import { NotificationEntity } from "./entities/notification.entity";
import { SettingsEntity } from "./entities/settings.entity";
import { UserEntity } from "./entities/user.entity";
import { ApiKeyEntity } from "./entities/api-key.entity";
import { DatabaseInitService } from "./database-init.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "server_monitor",
      entities: [
        ServerEntity,
        MetricSnapshotEntity,
        AlertEntity,
        NotificationEntity,
        SettingsEntity,
        UserEntity,
        ApiKeyEntity,
      ],
      synchronize:
        process.env.DB_SYNCHRONIZE === "true" ||
        (process.env.NODE_ENV !== "production" &&
          process.env.DB_SYNCHRONIZE !== "false"),
      retryAttempts: 5,
      retryDelay: 3000,
      extra: {
        max: Number(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    }),
    TypeOrmModule.forFeature([
      ServerEntity,
      MetricSnapshotEntity,
      AlertEntity,
      NotificationEntity,
      SettingsEntity,
      UserEntity,
      ApiKeyEntity,
    ]),
  ],
  providers: [DatabaseInitService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    this.logger.log(
      `Database configured (host: ${process.env.DB_HOST || "localhost"}, database: ${process.env.DB_NAME || "server_monitor"}, synchronize: ${process.env.DB_SYNCHRONIZE === "true" || (process.env.NODE_ENV !== "production" && process.env.DB_SYNCHRONIZE !== "false")})`,
    );
  }
}
