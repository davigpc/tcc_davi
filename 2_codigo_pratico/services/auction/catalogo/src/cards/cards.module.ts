import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardTypesModule } from '../card-types/card-types.module';
import { IdentidadeClient } from '../clients/identidade.client';
import { Card } from './card.entity';
import { CardTransfer } from './card-transfer.entity';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  imports: [TypeOrmModule.forFeature([Card, CardTransfer]), CardTypesModule],
  controllers: [CardsController],
  providers: [CardsService, IdentidadeClient],
  exports: [CardsService],
})
export class CardsModule {}
