import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BidSummary } from '../auctions/auctions.types';

@Injectable()
export class LancesClient {
  private readonly logger = new Logger(LancesClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('LANCES_URL');
  }

  async findHighestBid(auctionId: string): Promise<BidSummary | null> {
    const response = await this.request(
      `/api/internal/bids/${auctionId}/highest`,
    );

    if (response.status === 404 || response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new BadGatewayException('Lances service unavailable');
    }

    return (await response.json()) as BidSummary | null;
  }

  async findRecentBids(auctionId: string, limit: number): Promise<BidSummary[]> {
    const response = await this.request(
      `/api/internal/bids/${auctionId}?limit=${limit}`,
    );

    if (!response.ok) {
      throw new BadGatewayException('Lances service unavailable');
    }

    return (await response.json()) as BidSummary[];
  }

  async markClosed(auctionId: string): Promise<void> {
    try {
      const response = await this.request(
        `/api/internal/auctions/${auctionId}/closed`,
        { method: 'POST' },
      );

      if (!response.ok) {
        this.logger.warn(
          `Lances recusou o fechamento do leilao ${auctionId} (${response.status})`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao avisar o servico de Lances sobre o fechamento de ${auctionId}: ${
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
        `Falha ao consultar o servico de Lances: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadGatewayException('Lances service unavailable');
    }
  }
}
