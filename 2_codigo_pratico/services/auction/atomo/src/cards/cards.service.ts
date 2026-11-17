import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { PublicUser } from '../auctions/auctions.types';
import { CardTypesService } from '../card-types/card-types.service';
import { UsersDirectory } from '../users/users.directory';
import { Card, CardStatus } from './card.entity';
import { CardsPage, CardResponse } from './cards.types';
import { ListMyCardsQueryDto } from './dto/list-my-cards-query.dto';
import { MintCardDto } from './dto/mint-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    private readonly cardTypesService: CardTypesService,
    private readonly usersDirectory: UsersDirectory,
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
    const [owner] = await this.usersDirectory.findManyByIds([ownerUserId]);

    return {
      items: items.map((card) =>
        this.toResponse(card, owner ?? this.unknownOwner(ownerUserId)),
      ),
      nextCursor:
        hasNextPage && lastItem ? lastItem.createdAt.toISOString() : null,
    };
  }

  async mint(input: MintCardDto): Promise<CardResponse> {
    const [owner] = await this.usersDirectory.findManyByIds([
      input.ownerUserId,
    ]);

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

  toResponse(card: Card, owner: PublicUser): CardResponse {
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
