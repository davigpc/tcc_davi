import { Module } from '@nestjs/common';
import { CatalogoClient } from './catalogo.client';
import { IdentidadeClient } from './identidade.client';
import { LancesClient } from './lances.client';

@Module({
  providers: [CatalogoClient, IdentidadeClient, LancesClient],
  exports: [CatalogoClient, IdentidadeClient, LancesClient],
})
export class ClientsModule {}
