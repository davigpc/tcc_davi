import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CatalogoClient } from '../clients/catalogo.client';
import { LancesClient } from '../clients/lances.client';
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
    private readonly lancesClient: LancesClient,
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

    const databaseNow = await this.getDatabaseNow(this.dataSource.manager);

    if (databaseNow < auction.endTime) {
      return {
        auctionId,
        outcome: 'not-expired',
        rescheduleAt: auction.endTime,
      };
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      return { auctionId, outcome: 'already-final' };
    }

    auction.status = AuctionStatus.CLOSING;
    await this.dataSource.getRepository(Auction).save(auction);

    const highestBid = await this.lancesClient.findHighestBid(auction.id);

    let outcome: AuctionCloseOutcome = 'closed-without-bids';
    let winnerUserId: string | undefined;

    if (highestBid) {
      winnerUserId = highestBid.bidderUserId;
      await this.catalogoClient.transfer(
        auction.cardId,
        auction.id,
        highestBid.bidderUserId,
      );
      outcome = 'closed-with-winner';
    } else {
      await this.catalogoClient.unlock(auction.cardId, auction.sellerUserId);
    }

    auction.status = AuctionStatus.CLOSED;
    auction.closedAt = databaseNow;
    await this.dataSource.getRepository(Auction).save(auction);

    await this.lancesClient.markClosed(auction.id);

    const result: AuctionCloseResult = {
      auctionId: auction.id,
      outcome,
      winnerUserId,
      winningBidAmount: highestBid?.amount ?? null,
      closedAt: auction.closedAt,
    };

    await this.realtimeEventsPublisher.publishAuctionClosed({
      auctionId: result.auctionId,
      winnerUserId: result.winnerUserId ?? null,
      winningBidAmount: result.winningBidAmount ?? null,
      closedAt: result.closedAt!.toISOString(),
    });

    this.logger.log(`Leilao ${auction.id} fechado: ${outcome}`);

    return result;
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const result = await manager.query<{ now: Date | string }[]>(
      'SELECT NOW() AS now',
    );

    return new Date(result[0].now);
  }
}
