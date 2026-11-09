import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class PaginatedResourceDto<T> {
  @ApiProperty({ example: 50, description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'List of items' })
  items: T[];

  @ApiProperty({ example: 2, description: 'Current page number', default: 1 })
  @IsNumber({}, { message: ' "page" attribute should be a number ' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  @IsNumber({}, { message: ' "size" attribute should be a number ' })
  size: number;
}
