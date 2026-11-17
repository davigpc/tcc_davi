import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Bid } from '../bids/bid.entity';
import { CatalogoClient } from '../clients/catalogo.client';
import { RealtimeEventsPublisher } from '../realtime/realtime-events.publisher';
import { Auction, AuctionStatus } from './auction.entity';

export type AuctionCloseOutcome =
  | 'not-found'
  | 'already-final'
  | 'not-expired'
  | 'closed-without-bids'
  | 'closed-with-winner';

export interface AuctionCloseResult {
  auctionId: string;
  outcome: AuctionCloseOutcome;
  rescheduleAt?: Date;
  winnerUserId?: string;
  winningBidAmount?: number | null;
  closedAt?: Date;
}

@Injectable()
export class AuctionClosingService {
  private readonly logger = new Logger(AuctionClosingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly catalogoClient: CatalogoClient,
    private readonly realtimeEventsPublisher: RealtimeEventsPublisher,
  ) {}

  async closeAuction(auctionId: string): Promise<AuctionCloseResult> {
    const auction = await this.dataSource
      .getRepository(Auction)
      .findOne({ where: { id: auctionId } });

    if (!auction) {
      return { auctionId, outcome: 'not-found' };
    }

    if (
      auction.status === AuctionStatus.CLOSED ||
      auction.status === AuctionStatus.CANCELLED
    ) {
      return { auctionId, outcome: 'already-final' };
    }

    if (auction.status === AuctionStatus.ACTIVE) {
      const databaseNow = await this.databaseNow();

      if (databaseNow < auction.endTime) {
        return {
          auctionId,
          outcome: 'not-expired',
          rescheduleAt: auction.endTime,
        };
      }

      auction.status = AuctionStatus.CLOSING;
      await this.dataSource.getRepository(Auction).save(auction);
    }

    const highestBid = auction.currentHighestBidId
      ? await this.dataSource
          .getRepository(Bid)
          .findOne({ where: { id: auction.currentHighestBidId } })
      : null;

    const outcome: AuctionCloseOutcome = highestBid
      ? 'closed-with-winner'
      : 'closed-without-bids';

    if (highestBid) {
      await this.catalogoClient.transfer(
        auction.cardId,
        auction.id,
        highestBid.bidderUserId,
      );
    } else {
      await this.catalogoClient.unlock(auction.cardId, auction.sellerUserId);
    }

    const closedAt = await this.databaseNow();
    auction.status = AuctionStatus.CLOSED;
    auction.closedAt = closedAt;
    await this.dataSource.getRepository(Auction).save(auction);

    const result: AuctionCloseResult = {
      auctionId: auction.id,
      outcome,
      winnerUserId: highestBid?.bidderUserId,
      winningBidAmount: highestBid?.amount ?? null,
      closedAt,
    };

    await this.realtimeEventsPublisher.publishAuctionClosed({
      auctionId: result.auctionId,
      winnerUserId: result.winnerUserId ?? null,
      winningBidAmount: result.winningBidAmount ?? null,
      closedAt: closedAt.toISOString(),
    });

    this.logger.log(`Leilao ${auction.id} fechado: ${outcome}`);

    return result;
  }

  private async databaseNow(): Promise<Date> {
    const result = await this.dataSource.query<{ now: Date | string }[]>(
      'SELECT NOW() AS now',
    );

    return new Date(result[0].now);
  }
}
