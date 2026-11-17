import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from '../auctions/auction.entity';
import { Bid } from '../bids/bid.entity';
import { Card } from '../cards/card.entity';
import { CardTransfer } from '../cards/card-transfer.entity';
import { CardType } from '../card-types/card-type.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: configService.getOrThrow<number>('DATABASE_PORT'),
        username: configService.getOrThrow<string>('DATABASE_USER'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        database: configService.getOrThrow<string>('DATABASE_NAME'),
        entities: [User, CardType, Card, CardTransfer, Auction, Bid],
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('DATABASE_SYNC') ?? true,
      }),
    }),
  ],
})
export class DatabaseModule {}
