import { Module } from '@nestjs/common';
import { CatalogoClient } from './catalogo.client';
import { IdentidadeClient } from './identidade.client';

@Module({
  providers: [CatalogoClient, IdentidadeClient],
  exports: [CatalogoClient, IdentidadeClient],
})
export class ClientsModule {}
