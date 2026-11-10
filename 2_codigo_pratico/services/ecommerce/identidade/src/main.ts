import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { join } from 'node:path';
import { loggerOptions } from '@config/logger.config';
import { RolesGuard } from '@shared/guards/roles.guard';
import { IdentidadeModule } from './identidade.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(IdentidadeModule, {
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
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // A foto de perfil cai no mesmo volume servido pelo Catálogo em /uploads.
  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
