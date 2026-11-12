import { ItemTypes } from '@item/enums/item-types.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateItemDto {
  @ApiProperty({
    description: 'The item ID',
    example: '66b7b5a8901d3287c0cf6ea6',
  })
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'The item type',
    example: 'Product',
    enum: ItemTypes,
  })
  @IsEnum(ItemTypes)
  type: ItemTypes;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity: number;
}
