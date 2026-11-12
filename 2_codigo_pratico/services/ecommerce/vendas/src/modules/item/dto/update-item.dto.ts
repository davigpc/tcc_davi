import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @ApiProperty({ description: 'The new quantity of the item', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}
