import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, LessThan, Repository } from 'typeorm';
import { CardType } from '../card-types/card-type.entity';
import { CardTypesService } from '../card-types/card-types.service';
import { IdentidadeClient } from '../clients/identidade.client';
import { PublicUser } from '../users/user.types';
import { CardTransfer } from './card-transfer.entity';
import { Card, CardStatus } from './card.entity';
import { CardsPage, CardResponse, InternalCard } from './cards.types';
import { ListMyCardsQueryDto } from './dto/list-my-cards-query.dto';
import { MintCardDto } from './dto/mint-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    private readonly dataSource: DataSource,
    private readonly cardTypesService: CardTypesService,
    private readonly identidadeClient: IdentidadeClient,
  ) {}

  async listMine(
    ownerUserId: string,
    query: ListMyCardsQueryDto,
  ): Promise<CardsPage> {
    const limit = query.limit ?? 20;
    const where: FindOptionsWhere<Card> = {
      ownerUserId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.cursor) {
      where.createdAt = LessThan(new Date(query.cursor));
    }

    const cards = await this.cardsRepository.find({
      where,
      relations: {
        cardType: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit + 1,
    });

    const hasNextPage = cards.length > limit;
    const items = hasNextPage ? cards.slice(0, limit) : cards;
    const lastItem = items.at(-1);

    const owner = await this.identidadeClient.findById(ownerUserId);

    return {
      items: items.map((card) =>
        this.toResponse(card, owner ?? this.unknownOwner(card.ownerUserId)),
      ),
      nextCursor:
        hasNextPage && lastItem ? lastItem.createdAt.toISOString() : null,
    };
  }

  async mint(input: MintCardDto): Promise<CardResponse> {
    const owner = await this.identidadeClient.findById(input.ownerUserId);

    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    const cardType = await this.cardTypesService.findByIdOrThrow(
      input.cardTypeId,
    );

    const card = this.cardsRepository.create({
      ownerUserId: owner.id,
      cardTypeId: cardType.id,
      cardType,
      status: CardStatus.OWNED,
    });

    const savedCard = await this.cardsRepository.save(card);

    return this.toResponse({ ...savedCard, cardType }, owner);
  }

  async findInternalById(cardId: string): Promise<InternalCard> {
    const card = await this.cardsRepository.findOne({
      where: { id: cardId },
      relations: { cardType: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return this.toInternalCard(card);
  }

  async findManyInternalByIds(cardIds: string[]): Promise<InternalCard[]> {
    if (cardIds.length === 0) {
      return [];
    }

    const cards = await this.cardsRepository.find({
      where: { id: In(cardIds) },
      relations: { cardType: true },
    });

    return cards.map((card) => this.toInternalCard(card));
  }

  async lock(cardId: string, sellerUserId: string): Promise<InternalCard> {
    const card = await this.cardsRepository.findOne({
      where: { id: cardId },
      relations: { cardType: true },
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
    const savedCard = await this.cardsRepository.save(card);

    return this.toInternalCard({ ...savedCard, cardType: card.cardType });
  }

  async unlock(cardId: string, sellerUserId: string): Promise<InternalCard> {
    const card = await this.cardsRepository.findOne({
      where: { id: cardId },
      relations: { cardType: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.ownerUserId !== sellerUserId) {
      throw new ForbiddenException('Card does not belong to current user');
    }

    if (card.status === CardStatus.LOCKED_IN_AUCTION) {
      card.status = CardStatus.OWNED;
      await this.cardsRepository.save(card);
    }

    return this.toInternalCard(card);
  }

  async transfer(
    cardId: string,
    auctionId: string,
    toUserId: string,
  ): Promise<InternalCard> {
    const existingTransfer = await this.dataSource
      .getRepository(CardTransfer)
      .findOne({ where: { cardId, auctionId } });

    if (existingTransfer) {
      return this.findInternalById(cardId);
    }

    return this.dataSource.transaction(async (manager) => {
      const card = await manager.findOne(Card, {
        where: { id: cardId },
        relations: { cardType: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!card) {
        throw new NotFoundException('Card not found');
      }

      const transfer = manager.create(CardTransfer, {
        cardId: card.id,
        fromUserId: card.ownerUserId,
        toUserId,
        auctionId,
      });

      await manager.save(CardTransfer, transfer);

      card.ownerUserId = toUserId;
      card.status = CardStatus.OWNED;
      const savedCard = await manager.save(Card, card);

      return this.toInternalCard({
        ...savedCard,
        cardType: card.cardType,
      });
    });
  }

  private toInternalCard(card: Card): InternalCard {
    return {
      id: card.id,
      status: card.status,
      cardType: this.cardTypesService.toResponse(card.cardType),
      ownerUserId: card.ownerUserId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  private toResponse(card: Card, owner: PublicUser): CardResponse {
    return {
      id: card.id,
      status: card.status,
      cardType: this.cardTypesService.toResponse(card.cardType),
      owner,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  private unknownOwner(userId: string): PublicUser {
    return { id: userId, email: '', username: '' };
  }
}
