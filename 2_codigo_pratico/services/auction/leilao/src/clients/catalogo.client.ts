import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalCard } from '../auctions/auctions.types';

@Injectable()
export class CatalogoClient {
  private readonly logger = new Logger(CatalogoClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('CATALOGO_URL');
  }

  async findManyByIds(ids: string[]): Promise<InternalCard[]> {
    const uniqueIds = [...new Set(ids.filter((id) => Boolean(id)))];

    if (uniqueIds.length === 0) {
      return [];
    }

    const response = await this.request('/api/internal/cards/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds }),
    });

    if (!response.ok) {
      throw new BadGatewayException('Catalogo service unavailable');
    }

    return (await response.json()) as InternalCard[];
  }

  lock(cardId: string, sellerUserId: string): Promise<InternalCard> {
    return this.cardAction(cardId, 'lock', { sellerUserId });
  }

  unlock(cardId: string, sellerUserId: string): Promise<InternalCard> {
    return this.cardAction(cardId, 'unlock', { sellerUserId });
  }

  transfer(
    cardId: string,
    auctionId: string,
    toUserId: string,
  ): Promise<InternalCard> {
    return this.cardAction(cardId, 'transfer', { auctionId, toUserId });
  }

  private async cardAction(
    cardId: string,
    action: string,
    body: Record<string, string>,
  ): Promise<InternalCard> {
    const response = await this.request(
      `/api/internal/cards/${cardId}/${action}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (response.status === 404) {
      throw new NotFoundException('Card not found');
    }

    if (response.status === 403) {
      throw new ForbiddenException('Card does not belong to current user');
    }

    if (response.status === 409) {
      throw new ConflictException('Card is already locked in an auction');
    }

    if (!response.ok) {
      throw new BadGatewayException('Catalogo service unavailable');
    }

    return (await response.json()) as InternalCard;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar o Catalogo: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadGatewayException('Catalogo service unavailable');
    }
  }
}
