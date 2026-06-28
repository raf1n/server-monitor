import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Fail hard in production if JWT_SECRET is the dev default
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32 || secret === 'dev-secret-change-in-production') {
      logger.error('JWT_SECRET must be set to a strong random value in production (min 32 chars). Aborting.');
      process.exit(1);
    }
    if (!process.env.AGENT_API_KEY) {
      logger.error('AGENT_API_KEY must be set in production. Aborting.');
      process.exit(1);
    }
  }

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'ingest', method: RequestMethod.POST },
      { path: 'health', method: RequestMethod.GET },
      'agent.js',
      'install.sh',
      'agent-info',
    ],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));

  app.enableShutdownHooks();

  const port = process.env.PORT || 3300;
  await app.listen(port);
  logger.log(`Backend running on http://localhost:${port} (prefix: /api)`);
}
bootstrap();
