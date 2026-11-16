import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { CatalogoModule } from './catalogo.module';

async function bootstrap() {
  const app = await NestFactory.create(CatalogoModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
