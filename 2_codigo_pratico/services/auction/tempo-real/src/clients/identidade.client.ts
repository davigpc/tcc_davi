import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
}

@Injectable()
export class IdentidadeClient {
  private readonly logger = new Logger(IdentidadeClient.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('IDENTIDADE_URL');
  }

  async findById(id: string): Promise<PublicUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/internal/users/${id}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new BadGatewayException('Identidade service unavailable');
      }

      return (await response.json()) as PublicUser;
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar a Identidade: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
