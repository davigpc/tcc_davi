import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LeilaoClient } from '../clients/leilao.client';
import { RealtimeEventsPublisher } from '../realtime/realtime-events.publisher';
import { BidAuctionState } from './bid-auction-state.entity';
import { Bid } from './bid.entity';
import { BidResponse, BidsPage } from './bids.types';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidListSort, ListBidsQueryDto } from './dto/list-bids-query.dto';

const ACTIVE = 'ACTIVE';
const CLOSED = 'CLOSED';
const CANCELLED = 'CANCELLED';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private readonly bidsRepository: Repository<Bid>,
    @InjectRepository(BidAuctionState)
    private readonly statesRepository: Repository<BidAuctionState>,
    private readonly dataSource: DataSource,
    private readonly leilaoClient: LeilaoClient,
    private readonly realtimeEventsPublisher: RealtimeEventsPublisher,
  ) {}

  async placeBid(
    auctionId: string,
    bidderUserId: string,
    input: CreateBidDto,
  ): Promise<BidResponse> {
    await this.ensureState(auctionId);

    const result = await this.dataSource.transaction(async (manager) => {
      const state = await manager.findOne(BidAuctionState, {
        where: { auctionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!state) {
        throw new NotFoundException('Auction not found');
      }

      if (state.status !== ACTIVE) {
        throw new ConflictException('Auction is not active');
      }

      const databaseNow = await this.getDatabaseNow(manager);

      if (databaseNow >= state.endTime) {
        throw new ConflictException('Auction has ended');
      }

      if (state.sellerUserId === bidderUserId) {
        throw new ForbiddenException('Seller cannot bid on own auction');
      }

      if (!state.highestBidId && input.amount < state.startPrice) {
        throw new BadRequestException(
          `First bid must be at least ${state.startPrice}`,
        );
      }

      if (
        state.highestBidId &&
        state.highestBidAmount !== null &&
        input.amount <= state.highestBidAmount
      ) {
        throw new BadRequestException(
          `Bid must be greater than ${state.highestBidAmount}`,
        );
      }

      const previousHighestBid = state.highestBidId
        ? {
            bidderUserId: state.highestBidBidderUserId!,
            amount: state.highestBidAmount!,
          }
        : null;

      const savedBid = await manager.save(
        Bid,
        manager.create(Bid, {
          auctionId,
          bidderUserId,
          amount: input.amount,
        }),
      );

      state.highestBidId = savedBid.id;
      state.highestBidAmount = savedBid.amount;
      state.highestBidBidderUserId = savedBid.bidderUserId;
      state.highestBidCreatedAt = savedBid.createdAt;
      await manager.save(BidAuctionState, state);

      return { bid: savedBid, previousHighestBid };
    });

    const response = this.toResponse(result.bid);

    await this.leilaoClient.applyHighestBid(auctionId, response);

    await this.realtimeEventsPublisher.publishBidPlaced({
      auctionId: response.auctionId,
      bidId: response.id,
      bidderUserId: response.bidderUserId,
      amount: response.amount,
      createdAt: response.createdAt.toISOString(),
    });

    if (
      result.previousHighestBid &&
      result.previousHighestBid.bidderUserId !== bidderUserId
    ) {
      await this.realtimeEventsPublisher.publishOutbid({
        auctionId: response.auctionId,
        previousBidderUserId: result.previousHighestBid.bidderUserId,
        newBidderUserId: response.bidderUserId,
        newBidId: response.id,
        amount: response.amount,
        createdAt: response.createdAt.toISOString(),
      });
    }

    return response;
  }

  async listForAuction(
    auctionId: string,
    query: ListBidsQueryDto,
  ): Promise<BidsPage> {
    await this.ensureState(auctionId);

    const limit = query.limit ?? 25;
    const sort = query.sort ?? BidListSort.CREATED_AT;
    const sortColumn =
      sort === BidListSort.AMOUNT ? 'bid.amount' : 'bid.created_at';

    if (query.cursor && sort !== BidListSort.CREATED_AT) {
      throw new BadRequestException(
        'Cursor pagination is only supported with createdAt sort',
      );
    }

    const queryBuilder = this.bidsRepository
      .createQueryBuilder('bid')
      .where('bid.auction_id = :auctionId', { auctionId });

    if (query.cursor) {
      queryBuilder.andWhere('bid.created_at < :cursor', {
        cursor: new Date(query.cursor),
      });
    }

    const bids = await queryBuilder
      .orderBy(sortColumn, 'DESC')
      .addOrderBy('bid.created_at', 'DESC')
      .take(limit + 1)
      .getMany();

    const hasNextPage = bids.length > limit;
    const items = hasNextPage ? bids.slice(0, limit) : bids;
    const lastItem = items.at(-1);

    return {
      items: items.map((bid) => this.toResponse(bid)),
      nextCursor:
        hasNextPage && lastItem ? lastItem.createdAt.toISOString() : null,
    };
  }

  async findHighest(auctionId: string): Promise<BidResponse | null> {
    const state = await this.statesRepository.findOne({ where: { auctionId } });

    if (!state || !state.highestBidId) {
      return null;
    }

    return {
      id: state.highestBidId,
      auctionId,
      bidderUserId: state.highestBidBidderUserId!,
      amount: state.highestBidAmount!,
      createdAt: state.highestBidCreatedAt!,
    };
  }

  async findRecent(auctionId: string, limit: number): Promise<BidResponse[]> {
    const bids = await this.bidsRepository.find({
      where: { auctionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return bids.map((bid) => this.toResponse(bid));
  }

  async markClosed(auctionId: string): Promise<void> {
    const state = await this.statesRepository.findOne({ where: { auctionId } });

    if (!state) {
      return;
    }

    if (state.status === ACTIVE) {
      state.status = CLOSED;
      await this.statesRepository.save(state);
    }
  }

  async markCancelled(auctionId: string): Promise<void> {
    const state = await this.statesRepository.findOne({ where: { auctionId } });

    if (!state) {
      return;
    }

    if (state.status === ACTIVE || state.status === CLOSED) {
      state.status = CANCELLED;
      await this.statesRepository.save(state);
    }
  }

  toResponse(bid: Bid): BidResponse {
    return {
      id: bid.id,
      auctionId: bid.auctionId,
      bidderUserId: bid.bidderUserId,
      amount: bid.amount,
      createdAt: bid.createdAt,
    };
  }

  /**
   * Materializa o estado local na primeira operacao de um leilao. Depois
   * disso o servico responde sem consultar o Leilao.
   */
  private async ensureState(auctionId: string): Promise<void> {
    const existing = await this.statesRepository.findOne({
      where: { auctionId },
    });

    if (existing) {
      return;
    }

    const auction = await this.leilaoClient.findById(auctionId);

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    await this.statesRepository
      .createQueryBuilder()
      .insert()
      .into(BidAuctionState)
      .values({
        auctionId: auction.id,
        sellerUserId: auction.sellerUserId,
        status: auction.status,
        startPrice: auction.startPrice,
        endTime: new Date(auction.endTime),
        highestBidId: null,
        highestBidAmount: null,
        highestBidBidderUserId: null,
        highestBidCreatedAt: null,
      })
      .orIgnore()
      .execute();
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const result = await manager.query<{ now: Date | string }[]>(
      'SELECT NOW() AS now',
    );
    return new Date(result[0].now);
  }
}
