import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardType } from './card-type.entity';
import { CardTypesService } from './card-types.service';

/**
 * Somente o servico de tipos de carta.
 *
 * As rotas de /card-types continuam no monolito; o servico de Leilao usa o
 * servico apenas para montar a resposta do leilao (carta -> tipo).
 */
@Module({
  imports: [TypeOrmModule.forFeature([CardType])],
  providers: [CardTypesService],
  exports: [CardTypesService],
})
export class CardTypesModule {}
