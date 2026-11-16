import { NestFactory } from '@nestjs/core';
import { TempoRealModule } from './tempo-real.module';

async function bootstrap() {
  const app = await NestFactory.create(TempoRealModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
