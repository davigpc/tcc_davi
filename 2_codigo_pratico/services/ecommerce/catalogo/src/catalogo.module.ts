import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import redisStore from 'cache-manager-redis-store';
import mongoConfig from '@config/mongo.config';
import { ProductModule } from '@product/product.module';
import { HealthController } from './modules/health/health.controller';

/**
 * Serviço de Catálogo (Capacidade de Negócio / snapshot-1).
 *
 * Contém apenas a capacidade de catálogo: produto, busca e armazenamento das
 * imagens. O cache Redis acompanha o módulo porque o controller de produtos usa
 * `CacheInterceptor` e o serviço limpa as chaves a cada escrita.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mongoConfig,
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      }),
      inject: [ConfigService],
    }),
    ProductModule,
  ],
  controllers: [HealthController],
})
export class CatalogoModule {}
