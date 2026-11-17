import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionJobsModule } from '../auction-jobs/auction-jobs.module';
import { Bid } from '../bids/bid.entity';
import { Card } from '../cards/card.entity';
import { CardTransfer } from '../cards/card-transfer.entity';
import { CardTypesModule } from '../card-types/card-types.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { UsersModule } from '../users/users.module';
import { AuctionClosingService } from './auction-closing.service';
import { Auction } from './auction.entity';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Bid, Card, CardTransfer]),
    AuctionJobsModule,
    CardTypesModule,
    UsersModule,
    RealtimePublisherModule,
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionClosingService],
  exports: [AuctionsService, AuctionClosingService],
})
export class AuctionsModule {}
