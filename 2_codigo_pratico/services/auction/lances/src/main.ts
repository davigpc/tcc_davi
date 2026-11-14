import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { LancesModule } from './lances.module';

async function bootstrap() {
  const app = await NestFactory.create(LancesModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
