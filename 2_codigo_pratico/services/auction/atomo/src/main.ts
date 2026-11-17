import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AtomoModule } from './atomo.module';

async function bootstrap() {
  const app = await NestFactory.create(AtomoModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
