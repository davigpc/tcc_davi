import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { loggerOptions } from '@config/logger.config';
import { VendasModule } from './vendas.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(VendasModule, {
    logger: loggerOptions,
    rawBody: true,
  });

  app.set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
