import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';

/**
 * Módulo de endpoints internos (service-to-service). Não é exposto pelo NGINX.
 */
@Module({
  controllers: [InternalController],
})
export class InternalModule {}
