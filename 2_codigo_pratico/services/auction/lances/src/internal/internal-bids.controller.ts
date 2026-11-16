import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { BidsService } from '../bids/bids.service';
import { BidResponse } from '../bids/bids.types';

class RecentBidsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Controller('api/internal')
export class InternalBidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get('bids/:auctionId/highest')
  highest(@Param('auctionId') auctionId: string): Promise<BidResponse | null> {
    return this.bidsService.findHighest(auctionId);
  }

  @Get('bids/:auctionId')
  recent(
    @Param('auctionId') auctionId: string,
    @Query() query: RecentBidsQueryDto,
  ): Promise<BidResponse[]> {
    return this.bidsService.findRecent(auctionId, query.limit ?? 10);
  }

  @Post('auctions/:auctionId/closed')
  async markClosed(
    @Param('auctionId') auctionId: string,
  ): Promise<{ status: string }> {
    await this.bidsService.markClosed(auctionId);
    return { status: 'closed' };
  }

  @Post('auctions/:auctionId/cancelled')
  async markCancelled(
    @Param('auctionId') auctionId: string,
  ): Promise<{ status: string }> {
    await this.bidsService.markCancelled(auctionId);
    return { status: 'cancelled' };
  }
}
