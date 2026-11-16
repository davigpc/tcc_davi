import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { InternalCardsController } from './internal-cards.controller';

@Module({
  imports: [CardsModule],
  controllers: [InternalCardsController],
})
export class InternalModule {}
