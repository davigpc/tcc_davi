import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  IsArray,
  IsUUID,
} from 'class-validator';
import { CardsService } from '../cards/cards.service';
import { InternalCard } from '../cards/cards.types';

class BatchCardsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

class LockCardDto {
  @IsUUID()
  sellerUserId!: string;
}

class TransferCardDto {
  @IsUUID()
  auctionId!: string;

  @IsUUID()
  toUserId!: string;
}

@Controller('api/internal/cards')
export class InternalCardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':id')
  findById(@Param('id') id: string): Promise<InternalCard> {
    return this.cardsService.findInternalById(id);
  }

  @Post('batch')
  batch(@Body() body: BatchCardsDto): Promise<InternalCard[]> {
    return this.cardsService.findManyInternalByIds(body.ids ?? []);
  }

  @Post(':id/lock')
  lock(
    @Param('id') id: string,
    @Body() body: LockCardDto,
  ): Promise<InternalCard> {
    return this.cardsService.lock(id, body.sellerUserId);
  }

  @Post(':id/unlock')
  unlock(
    @Param('id') id: string,
    @Body() body: LockCardDto,
  ): Promise<InternalCard> {
    return this.cardsService.unlock(id, body.sellerUserId);
  }

  @Post(':id/transfer')
  transfer(
    @Param('id') id: string,
    @Body() body: TransferCardDto,
  ): Promise<InternalCard> {
    return this.cardsService.transfer(id, body.auctionId, body.toUserId);
  }
}
