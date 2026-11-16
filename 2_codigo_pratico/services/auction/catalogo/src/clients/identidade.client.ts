import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicUser } from '../users/user.types';

@Injectable()
export class IdentidadeClient {
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('IDENTIDADE_URL');
  }

  async findById(id: string): Promise<PublicUser | null> {
    const response = await this.request(`/api/internal/users/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new BadGatewayException('Identidade service unavailable');
    }

    return (await response.json()) as PublicUser;
  }

  private async request(path: string): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`);
    } catch {
      throw new BadGatewayException('Identidade service unavailable');
    }
  }
}
