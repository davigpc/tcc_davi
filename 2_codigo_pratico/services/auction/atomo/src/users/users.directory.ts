import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PublicUser } from '../auctions/auctions.types';
import { IdentidadeClient } from '../clients/identidade.client';
import { User } from './user.entity';
import { UsersService } from './users.service';

/**
 * Resolve os dados publicos de usuario.
 *
 * Na fase de banco compartilhado (s1/s2) a leitura e local, na mesma base.
 * No snapshot final a Identidade tem banco proprio e a leitura passa a ser
 * feita pela API interna do servico.
 */
@Injectable()
export class UsersDirectory {
  private readonly httpMode: boolean;

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly identidadeClient: IdentidadeClient,
    @Optional()
    @InjectRepository(User)
    private readonly usersRepository: Repository<User> | null,
  ) {
    this.httpMode = configService.get<string>('USERS_MODE') === 'http';
  }

  async findManyByIds(ids: string[]): Promise<PublicUser[]> {
    const uniqueIds = [...new Set(ids.filter((id) => Boolean(id)))];

    if (uniqueIds.length === 0) {
      return [];
    }

    if (this.httpMode) {
      return this.identidadeClient.findManyByIds(uniqueIds);
    }

    if (!this.usersRepository) {
      return [];
    }

    const users = await this.usersRepository.find({
      where: { id: In(uniqueIds) },
    });

    return users.map((user) => this.usersService.toPublicUser(user));
  }
}
