import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';

/**
 * Módulo de endpoints internos (service-to-service).
 * Não é exposto pelo gateway NGINX; consumido apenas pelos demais serviços
 * via rede interna do Docker (ex.: Relatórios lê dados de Estoque).
 */
@Module({
  controllers: [InternalController],
})
export class InternalModule {}
