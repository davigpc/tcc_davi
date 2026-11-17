import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicUser } from '../auctions/auctions.types';

@Injectable()
export class IdentidadeClient {
  private readonly logger = new Logger(IdentidadeClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('IDENTIDADE_URL');
  }

  async findManyByIds(ids: string[]): Promise<PublicUser[]> {
    const uniqueIds = [...new Set(ids.filter((id) => Boolean(id)))];

    if (uniqueIds.length === 0) {
      return [];
    }

    const response = await this.request('/api/internal/users/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds }),
    });

    if (!response.ok) {
      throw new BadGatewayException('Identidade service unavailable');
    }

    return (await response.json()) as PublicUser[];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar a Identidade: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadGatewayException('Identidade service unavailable');
    }
  }
}
