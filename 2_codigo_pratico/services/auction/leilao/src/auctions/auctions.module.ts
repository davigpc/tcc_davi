import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionJobsModule } from '../auction-jobs/auction-jobs.module';
import { ClientsModule } from '../clients/clients.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { AuctionClosingService } from './auction-closing.service';
import { Auction } from './auction.entity';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction]),
    AuctionJobsModule,
    ClientsModule,
    RealtimePublisherModule,
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionClosingService],
  exports: [AuctionsService, AuctionClosingService],
})
export class AuctionsModule {}
