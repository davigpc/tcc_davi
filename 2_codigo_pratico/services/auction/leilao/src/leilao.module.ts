import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuctionsModule } from './auctions/auctions.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';

/**
 * API do servico de Leilao (Capacidade de Negocio / snapshot final).
 *
 * Responde por /auctions com banco proprio (leilao_db). Carta e usuarios sao
 * consultados por chamadas internas. O fechamento assincrono roda no mesmo
 * servico, pelo entrypoint worker.ts.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    AuctionsModule,
    InternalModule,
  ],
})
export class LeilaoModule {}
