import { Module } from '@nestjs/common';
import { IdentidadeClient } from './identidade.client';

@Module({
  providers: [IdentidadeClient],
  exports: [IdentidadeClient],
})
export class ClientsModule {}
