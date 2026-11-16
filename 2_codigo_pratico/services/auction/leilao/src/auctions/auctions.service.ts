import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuctionCloseQueueService } from '../auction-jobs/auction-close-queue.service';
import { CatalogoClient } from '../clients/catalogo.client';
import { IdentidadeClient } from '../clients/identidade.client';
import { LancesClient } from '../clients/lances.client';
import { RealtimeEventsPublisher } from '../realtime/realtime-events.publisher';
import { Auction, AuctionStatus } from './auction.entity';
import {
  AuctionDetailResponse,
  AuctionsPage,
  AuctionResponse,
  BidSummary,
  CardSummary,
  InternalAuction,
  InternalCard,
  PublicUser,
} from './auctions.types';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { ListAuctionsQueryDto } from './dto/list-auctions-query.dto';

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionsRepository: Repository<Auction>,
    private readonly configService: ConfigService,
    private readonly auctionCloseQueueService: AuctionCloseQueueService,
    private readonly catalogoClient: CatalogoClient,
    private readonly identidadeClient: IdentidadeClient,
    private readonly lancesClient: LancesClient,
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

    const card = await this.catalogoClient.lock(input.cardId, sellerUserId);

    let auction: Auction;

    try {
      auction = await this.auctionsRepository.save(
        this.auctionsRepository.create({
          cardId: card.id,
          sellerUserId,
          status: AuctionStatus.ACTIVE,
          startPrice: input.startPrice,
          currentHighestBidId: null,
          highestBid: null,
          startTime,
          endTime,
          closedAt: null,
          cancelledAt: null,
        }),
      );
    } catch (error) {
      await this.catalogoClient
        .unlock(card.id, sellerUserId)
        .catch((unlockError: unknown) =>
          this.logger.error(
            `Falha ao desfazer a trava da carta ${card.id}: ${
              unlockError instanceof Error
                ? unlockError.message
                : String(unlockError)
            }`,
          ),
        );

      throw error;
    }

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
      .where('auction.status = :status', { status });

    if (query.sellerUserId) {
      queryBuilder.andWhere('auction.seller_user_id = :sellerUserId', {
        sellerUserId: query.sellerUserId,
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

    const composed = await this.compose(page);
    const items = query.cardTypeId
      ? composed.filter((item) => item.card.cardType.id === query.cardTypeId)
      : composed;

    return {
      items,
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
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const [card] = await this.catalogoClient.findManyByIds([auction.cardId]);

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const users = await this.identidadeClient.findManyByIds([
      auction.sellerUserId,
      card.ownerUserId,
    ]);
    const seller = users.find((user) => user.id === auction.sellerUserId);
    const owner = users.find((user) => user.id === card.ownerUserId);

    if (!seller || !owner) {
      throw new BadGatewayException(
        'User not found in the Identidade service',
      );
    }

    const recentBids = await this.lancesClient.findRecentBids(auction.id, 10);

    return this.toDetailResponse(auction, card, seller, owner, recentBids);
  }

  private async compose(auctions: Auction[]): Promise<AuctionDetailResponse[]> {
    if (auctions.length === 0) {
      return [];
    }

    const cards = await this.catalogoClient.findManyByIds(
      auctions.map((auction) => auction.cardId),
    );
    const cardsById = new Map(cards.map((card) => [card.id, card]));

    const users = await this.identidadeClient.findManyByIds([
      ...auctions.map((auction) => auction.sellerUserId),
      ...cards.map((card) => card.ownerUserId),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));

    return auctions.map((auction) => {
      const card = cardsById.get(auction.cardId);

      if (!card) {
        throw new NotFoundException('Card not found');
      }

      const seller = usersById.get(auction.sellerUserId);
      const owner = usersById.get(card.ownerUserId);

      if (!seller || !owner) {
        throw new BadGatewayException(
          'User not found in the Identidade service',
        );
      }

      return this.toDetailResponse(auction, card, seller, owner, []);
    });
  }

  async findInternalById(auctionId: string): Promise<InternalAuction> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    return {
      id: auction.id,
      cardId: auction.cardId,
      sellerUserId: auction.sellerUserId,
      status: auction.status,
      startPrice: auction.startPrice,
      endTime: auction.endTime,
      currentHighestBidId: auction.currentHighestBidId,
    };
  }

  async applyHighestBid(auctionId: string, bid: BidSummary): Promise<void> {
    await this.auctionsRepository.update(
      { id: auctionId },
      {
        currentHighestBidId: bid.id,
        highestBid: bid,
      },
    );
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
    card: InternalCard,
    seller: PublicUser,
    owner: PublicUser,
    recentBids: BidSummary[],
  ): AuctionDetailResponse {
    return {
      ...this.toResponse(auction),
      card: this.toCardSummary(card, owner),
      seller,
      recentBids,
    };
  }

  private toCardSummary(card: InternalCard, owner: PublicUser): CardSummary {
    return {
      id: card.id,
      status: card.status,
      cardType: card.cardType,
      owner,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  private toResponse(auction: Auction): AuctionResponse {
    return {
      id: auction.id,
      cardId: auction.cardId,
      sellerUserId: auction.sellerUserId,
      status: auction.status,
      startPrice: auction.startPrice,
      currentHighestBid: auction.highestBid ?? null,
      startTime: auction.startTime,
      endTime: auction.endTime,
      closedAt: auction.closedAt,
      cancelledAt: auction.cancelledAt,
    };
  }
}
