import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CardTypesModule } from './card-types/card-types.module';
import { CardsModule } from './cards/cards.module';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';

/**
 * Servico de Catalogo de Cartas (Capacidade de Negocio / snapshot final).
 *
 * Responde por /cards e /card-types e expoe travas e transferencias internas
 * em /api/internal/cards. Tem banco proprio (catalogo_db).
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    CardTypesModule,
    CardsModule,
    InternalModule,
  ],
})
export class CatalogoModule {}
