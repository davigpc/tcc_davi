import { Module } from '@nestjs/common';
import { BidsModule } from '../bids/bids.module';
import { InternalBidsController } from './internal-bids.controller';

@Module({
  imports: [BidsModule],
  controllers: [InternalBidsController],
})
export class InternalModule {}
