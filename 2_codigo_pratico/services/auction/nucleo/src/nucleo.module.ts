import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuctionJobsModule } from './auction-jobs/auction-jobs.module';
import { AuctionsModule } from './auctions/auctions.module';
import { BidsModule } from './bids/bids.module';

/**
 * Nucleo do leilao (Subdominio / snapshot final).
 *
 * Reune leiloes, lances, tarefas de fechamento e o worker no mesmo servico e no
 * mesmo banco (leilao_db). A carta e o usuario sao consultados por chamadas
 * internas ao Catalogo e a Identidade.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    AuctionJobsModule,
    AuctionsModule,
    BidsModule,
  ],
})
export class NucleoModule {}
