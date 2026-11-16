import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';

/**
 * Servico de Identidade (Capacidade de Negocio / snapshot final).
 *
 * Responde por /auth e expoe consultas internas de usuarios em
 * /api/internal/users. Tem banco proprio (identity_db).
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    InternalModule,
  ],
})
export class IdentidadeModule {}
