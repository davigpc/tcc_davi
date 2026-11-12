import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';

/**
 * Disponibiliza a validação local do token de acesso nas capacidades que ainda
 * vivem no monólito (Vendas).
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [AccessTokenGuard],
  exports: [AccessTokenGuard, JwtModule],
})
export class AccessTokenModule {}
