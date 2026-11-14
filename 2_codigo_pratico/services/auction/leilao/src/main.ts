import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { LeilaoModule } from './leilao.module';

async function bootstrap() {
  const app = await NestFactory.create(LeilaoModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
