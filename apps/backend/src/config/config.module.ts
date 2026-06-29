import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().min(16).required().messages({
          'string.min': 'JWT_SECRET must be at least 16 characters',
          'any.required': 'JWT_SECRET is required',
        }),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().default('postgres'),
        DB_NAME: Joi.string().default('server_monitor'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        AGENT_API_KEY: Joi.string().optional(),
        CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
        PORT: Joi.number().default(3300),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        METRICS_RETENTION_DAYS: Joi.number().default(7),
        ALLOW_REGISTRATION: Joi.boolean().default(false),
        ADMIN_USERNAME: Joi.string().default('admin'),
        ADMIN_PASSWORD: Joi.string().optional(),
        REDIS_PASSWORD: Joi.string().optional(),
      }),
    }),
  ],
})
export class ConfigModule {}
