import { Module } from '@nestjs/common';
import { AuctionsModule } from '../auctions/auctions.module';
import { InternalAuctionsController } from './internal-auctions.controller';

@Module({
  imports: [AuctionsModule],
  controllers: [InternalAuctionsController],
})
export class InternalModule {}
