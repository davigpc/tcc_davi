import { Module } from '@nestjs/common';
import { LeilaoClient } from './leilao.client';

@Module({
  providers: [LeilaoClient],
  exports: [LeilaoClient],
})
export class ClientsModule {}
