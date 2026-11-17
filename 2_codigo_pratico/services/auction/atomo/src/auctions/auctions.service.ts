import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuctionCloseQueueService } from '../auction-jobs/auction-close-queue.service';
import { Card, CardStatus } from '../cards/card.entity';
import { CardTypesService } from '../card-types/card-types.service';
import { Bid } from '../bids/bid.entity';
import { RealtimeEventsPublisher } from '../realtime/realtime-events.publisher';
import { UsersDirectory } from '../users/users.directory';
import { Auction, AuctionStatus } from './auction.entity';
import {
  AuctionDetailResponse,
  AuctionsPage,
  AuctionResponse,
  BidResponse,
  CardSummary,
  PublicUser,
} from './auctions.types';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { ListAuctionsQueryDto } from './dto/list-auctions-query.dto';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionsRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidsRepository: Repository<Bid>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly auctionCloseQueueService: AuctionCloseQueueService,
    private readonly cardTypesService: CardTypesService,
    private readonly usersDirectory: UsersDirectory,
    private readonly realtimeEventsPublisher: RealtimeEventsPublisher,
  ) {}

  async create(
    sellerUserId: string,
    input: CreateAuctionDto,
  ): Promise<AuctionDetailResponse> {
    this.validateDuration(input.durationSeconds);

    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() + input.durationSeconds * 1000,
    );

    const auction = await this.dataSource.transaction(async (manager) => {
      const card = await manager.findOne(Card, {
        where: { id: input.cardId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!card) {
        throw new NotFoundException('Card not found');
      }

      if (card.ownerUserId !== sellerUserId) {
        throw new ForbiddenException('Card does not belong to current user');
      }

      if (card.status !== CardStatus.OWNED) {
        throw new ConflictException('Card is already locked in an auction');
      }

      card.status = CardStatus.LOCKED_IN_AUCTION;
      await manager.save(Card, card);

      return manager.save(
        Auction,
        manager.create(Auction, {
          cardId: card.id,
          sellerUserId,
          status: AuctionStatus.ACTIVE,
          startPrice: input.startPrice,
          currentHighestBidId: null,
          startTime,
          endTime,
          closedAt: null,
          cancelledAt: null,
        }),
      );
    });

    try {
      await this.auctionCloseQueueService.scheduleClose(auction);
    } catch (error) {
      console.error(
        `Failed to schedule close job for auction ${auction.id}`,
        error,
      );
    }

    const response = await this.findById(auction.id);

    await this.realtimeEventsPublisher.publishAuctionCreated({
      auctionId: response.id,
      cardId: response.cardId,
      sellerUserId: response.sellerUserId,
      startPrice: response.startPrice,
      startTime: response.startTime.toISOString(),
      endTime: response.endTime.toISOString(),
    });

    return response;
  }

  async list(query: ListAuctionsQueryDto): Promise<AuctionsPage> {
    const limit = query.limit ?? 25;
    const status = query.status ?? AuctionStatus.ACTIVE;
    const isActiveList = status === AuctionStatus.ACTIVE;
    const sortColumn = isActiveList ? 'auction.end_time' : 'auction.closed_at';
    const sortDirection: 'ASC' | 'DESC' = isActiveList ? 'ASC' : 'DESC';

    const queryBuilder = this.auctionsRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.card', 'card')
      .leftJoinAndSelect('card.cardType', 'cardType')
      .leftJoinAndSelect('auction.currentHighestBid', 'currentHighestBid')
      .where('auction.status = :status', { status });

    if (query.sellerUserId) {
      queryBuilder.andWhere('auction.seller_user_id = :sellerUserId', {
        sellerUserId: query.sellerUserId,
      });
    }

    if (query.cardTypeId) {
      queryBuilder.andWhere('card.card_type_id = :cardTypeId', {
        cardTypeId: query.cardTypeId,
      });
    }

    if (query.cursor) {
      queryBuilder.andWhere(
        `${sortColumn} ${isActiveList ? '>' : '<'} :cursor`,
        { cursor: new Date(query.cursor) },
      );
    }

    const auctions = await queryBuilder
      .orderBy(sortColumn, sortDirection)
      .take(limit + 1)
      .getMany();

    const hasNextPage = auctions.length > limit;
    const page = hasNextPage ? auctions.slice(0, limit) : auctions;
    const lastItem = page.at(-1);

    const users = await this.usersDirectory.findManyByIds([
      ...page.map((auction) => auction.sellerUserId),
      ...page.map((auction) => auction.card.ownerUserId),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));

    return {
      items: page.map((auction) =>
        this.toDetailResponse(
          auction,
          this.requireUser(usersById, auction.sellerUserId),
          this.requireUser(usersById, auction.card.ownerUserId),
          [],
        ),
      ),
      nextCursor:
        hasNextPage && lastItem
          ? ((isActiveList
              ? lastItem.endTime
              : lastItem.closedAt
            )?.toISOString() ?? null)
          : null,
    };
  }

  async findById(auctionId: string): Promise<AuctionDetailResponse> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: {
        card: { cardType: true },
        currentHighestBid: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const users = await this.usersDirectory.findManyByIds([
      auction.sellerUserId,
      auction.card.ownerUserId,
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));

    const recentBids = await this.bidsRepository.find({
      where: { auctionId: auction.id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return this.toDetailResponse(
      auction,
      this.requireUser(usersById, auction.sellerUserId),
      this.requireUser(usersById, auction.card.ownerUserId),
      recentBids.map((bid) => this.toBidResponse(bid)),
    );
  }

  private requireUser(
    usersById: Map<string, PublicUser>,
    userId: string,
  ): PublicUser {
    const user = usersById.get(userId);

    if (!user) {
      throw new BadGatewayException('User not found in the Identidade service');
    }

    return user;
  }

  private validateDuration(durationSeconds: number): void {
    const minDuration = Number(
      this.configService.getOrThrow('AUCTION_MIN_DURATION_SECONDS'),
    );
    const maxDuration = Number(
      this.configService.getOrThrow('AUCTION_MAX_DURATION_SECONDS'),
    );

    if (durationSeconds < minDuration || durationSeconds > maxDuration) {
      throw new BadRequestException(
        `Auction duration must be between ${minDuration} and ${maxDuration} seconds`,
      );
    }
  }

  private toDetailResponse(
    auction: Auction,
    seller: PublicUser,
    owner: PublicUser,
    recentBids: BidResponse[],
  ): AuctionDetailResponse {
    return {
      ...this.toResponse(auction),
      card: this.toCardSummary(auction, owner),
      seller,
      recentBids,
    };
  }

  private toCardSummary(auction: Auction, owner: PublicUser): CardSummary {
    return {
      id: auction.card.id,
      status: auction.card.status,
      cardType: this.cardTypesService.toResponse(auction.card.cardType),
      owner,
      createdAt: auction.card.createdAt,
      updatedAt: auction.card.updatedAt,
    };
  }

  private toBidResponse(bid: Bid): BidResponse {
    return {
      id: bid.id,
      auctionId: bid.auctionId,
      bidderUserId: bid.bidderUserId,
      amount: bid.amount,
      createdAt: bid.createdAt,
    };
  }

  private toResponse(auction: Auction): AuctionResponse {
    return {
      id: auction.id,
      cardId: auction.cardId,
      sellerUserId: auction.sellerUserId,
      status: auction.status,
      startPrice: auction.startPrice,
      currentHighestBid: auction.currentHighestBid
        ? this.toBidResponse(auction.currentHighestBid)
        : null,
      startTime: auction.startTime,
      endTime: auction.endTime,
      closedAt: auction.closedAt,
      cancelledAt: auction.cancelledAt,
    };
  }
}
