import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BidsModule } from './bids/bids.module';
import { HealthModule } from './health/health.module';

/**
 * Servico de Lances (Capacidade de Negocio / snapshot-1).
 *
 * Responde por `POST /auctions/:id/bids` e `GET /auctions/:id/bids`. O banco
 * ainda e o do monolito: a transacao do lance trava o leilao na mesma base e
 * publica os eventos de tempo real pelo Redis.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    BidsModule,
  ],
})
export class LancesModule {}
