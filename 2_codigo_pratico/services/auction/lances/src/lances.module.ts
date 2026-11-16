import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { BidsModule } from './bids/bids.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';

/**
 * Servico de Lances (Capacidade de Negocio / snapshot final).
 *
 * Responde por /auctions/:id/bids com banco proprio (lances_db). A invariante
 * de lance crescente e verificada localmente; o estado do leilao e copiado na
 * primeira operacao e a projecao do maior lance segue para o servico de Leilao
 * por chamada interna.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    BidsModule,
    InternalModule,
  ],
})
export class LancesModule {}
