import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import { loggerOptions } from '@config/logger.config';
import { CatalogoModule } from './catalogo.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(CatalogoModule, {
    logger: loggerOptions,
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Arquivos gravados pelo armazenamento local (antes servidos pelo monólito).
  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
