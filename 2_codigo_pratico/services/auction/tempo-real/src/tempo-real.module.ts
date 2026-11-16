import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './health/health.module';
import { IdentidadeClient } from './clients/identidade.client';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { RealtimeRedisSubscriber } from './realtime/realtime-redis.subscriber';
import { RealtimeSocketService } from './realtime/realtime-socket.service';

/**
 * Servico de Tempo Real (Capacidade de Negocio / snapshot final).
 *
 * Hospeda o servidor Socket.IO e assina o canal de eventos no Redis. Nao tem
 * banco: os eventos chegam publicados pelos servicos de Leilao e Lances.
 */
@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    IdentidadeClient,
    RealtimeGateway,
    RealtimeSocketService,
    RealtimeRedisSubscriber,
  ],
})
export class TempoRealModule {}
