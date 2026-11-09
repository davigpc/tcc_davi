import { Module } from '@nestjs/common';
import { EmailModule } from '@email/email.module';
import { HealthController } from './modules/health/health.controller';

/**
 * Serviço de Comunicação (Capacidade de Negócio / snapshot final).
 *
 * Contém apenas o envio de e-mail. Não tem banco: o transporte é local e a
 * mensagem é descartada depois de registrada no log.
 */
@Module({
  imports: [EmailModule],
  controllers: [HealthController],
})
export class ComunicacaoModule {}
