import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CardTypesModule } from './card-types/card-types.module';
import { CardsModule } from './cards/cards.module';
import { AuctionJobsModule } from './auction-jobs/auction-jobs.module';
import { AuctionsModule } from './auctions/auctions.module';
import { BidsModule } from './bids/bids.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CardTypesModule,
    CardsModule,
    AuctionJobsModule,
    AuctionsModule,
    BidsModule,
  ],
})
export class AtomoModule {}
