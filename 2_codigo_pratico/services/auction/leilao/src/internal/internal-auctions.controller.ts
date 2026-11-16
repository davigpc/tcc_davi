import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsInt, IsISO8601, IsUUID, Min } from 'class-validator';
import { AuctionsService } from '../auctions/auctions.service';
import { BidSummary, InternalAuction } from '../auctions/auctions.types';

class ApplyHighestBidDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  bidderUserId!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsISO8601()
  createdAt!: string;
}

@Controller('api/internal/auctions')
export class InternalAuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get(':id')
  findById(@Param('id') id: string): Promise<InternalAuction> {
    return this.auctionsService.findInternalById(id);
  }

  @Post(':id/highest-bid')
  async applyHighestBid(
    @Param('id') id: string,
    @Body() body: ApplyHighestBidDto,
  ): Promise<{ status: string }> {
    const bid: BidSummary = {
      id: body.id,
      auctionId: id,
      bidderUserId: body.bidderUserId,
      amount: body.amount,
      createdAt: new Date(body.createdAt),
    };

    await this.auctionsService.applyHighestBid(id, bid);

    return { status: 'applied' };
  }
}
