import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BidResponse } from '../bids/bids.types';

export interface LeilaoAuction {
  id: string;
  cardId: string;
  sellerUserId: string;
  status: string;
  startPrice: number;
  endTime: string;
  currentHighestBidId: string | null;
}

@Injectable()
export class LeilaoClient {
  private readonly logger = new Logger(LeilaoClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('LEILAO_URL');
  }

  async findById(auctionId: string): Promise<LeilaoAuction | null> {
    const response = await this.request(`/api/internal/auctions/${auctionId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new BadGatewayException('Leilao service unavailable');
    }

    return (await response.json()) as LeilaoAuction;
  }

  async applyHighestBid(auctionId: string, bid: BidResponse): Promise<void> {
    try {
      const response = await this.request(
        `/api/internal/auctions/${auctionId}/highest-bid`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: bid.id,
            bidderUserId: bid.bidderUserId,
            amount: bid.amount,
            createdAt: new Date(bid.createdAt).toISOString(),
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Leilao recusou a projecao do lance ${bid.id} (${response.status})`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao projetar o lance ${bid.id} no Leilao: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar o servico de Leilao: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new NotFoundException('Auction service unavailable');
    }
  }
}
