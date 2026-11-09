import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'The unique identifier of the seller',
    example: '66b7b3e8c32055a049b55029',
  })
  seller: string;

  @ApiProperty({ description: 'The number of products in stock', example: 10 })
  stock: number;

  @ApiProperty({
    description: 'The price of the product',
    example: 100,
  })
  price: number;

  @ApiProperty({
    description: 'The name of the product',
    example: 'Sample Product',
  })
  name: string;

  @ApiProperty({
    description: 'A brief description of the product',
    example: 'This is a sample product',
  })
  description?: string;

  @ApiProperty({
    description: 'Array of image files',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: true,
  })
  images?: any;

  @ApiProperty({
    description: 'The category of the product',
    example: 'sample category',
  })
  category: string;

  @ApiProperty({
    description: 'The subcategory of the product',
    example: 'sample subcategory',
  })
  subcategory: string;

  @ApiProperty({
    description: 'Attributes of the product',
    example: [
      { key: 'color', value: 'red' },
      { key: 'size', value: 'M' },
    ],
  })
  attributes: { key: string; value: string }[];
}
