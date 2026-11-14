import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CardTypesModule } from './card-types/card-types.module';
import { AuctionsModule } from './auctions/auctions.module';
import { HealthModule } from './health/health.module';

/**
 * API do servico de Leilao (Capacidade de Negocio / snapshot-2).
 *
 * Responde por /auctions. O fechamento assincrono roda no mesmo servico, pelo
 * entrypoint worker.ts.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CardTypesModule,
    AuctionsModule,
  ],
})
export class LeilaoModule {}
