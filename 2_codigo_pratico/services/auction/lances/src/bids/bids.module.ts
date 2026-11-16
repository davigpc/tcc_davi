import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { BidAuctionState } from './bid-auction-state.entity';
import { Bid } from './bid.entity';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, BidAuctionState]),
    ClientsModule,
    RealtimePublisherModule,
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
